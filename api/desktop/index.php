<?php
require '../../includes/misc/autoload.phtml';
require '../../includes/api/shared/autoload.phtml';

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

set_exception_handler(function ($exception) {
    error_log("\n--------------------------------------------------------------\n");
    error_log($exception);
    error_log("\nRequest data:");
    error_log(print_r(misc\etc\maskSensitiveForLog($_POST), true));
    error_log("\n--------------------------------------------------------------");

    http_response_code(500);
    echo json_encode(
        array(
            "success" => false,
            "message" => "Internal server error."
        )
    );
    exit();
});

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(
        array(
            "success" => false,
            "message" => "Method not allowed. Use POST."
        )
    );
    exit();
}

$action = misc\etc\sanitize($_POST['action'] ?? 'generate');
$ownerid = misc\etc\sanitize($_POST['ownerid'] ?? '');
$name = misc\etc\sanitize($_POST['name'] ?? '');
$sellerkey = misc\etc\sanitize($_POST['sellerkey'] ?? '');
$clientIp = api\shared\primary\getIp();

if (empty($ownerid) || empty($name) || empty($sellerkey)) {
    echo json_encode(
        array(
            "success" => false,
            "message" => "Missing required params: ownerid, name, sellerkey."
        )
    );
    exit();
}

$query = misc\mysql\query(
    "SELECT `secret`, `owner`, `sellerkey`, `enabled`, `banned`, `sellerApiWhitelist` FROM `apps` WHERE `ownerid` = ? AND `name` = ? LIMIT 1",
    array($ownerid, $name)
);

if ($query->num_rows < 1) {
    echo json_encode(
        array(
            "success" => false,
            "message" => "Application not found."
        )
    );
    exit();
}

$row = mysqli_fetch_array($query->result);
if (!hash_equals((string) $row['sellerkey'], (string) $sellerkey)) {
    echo json_encode(
        array(
            "success" => false,
            "message" => "Invalid sellerkey."
        )
    );
    exit();
}

if (!$row['enabled'] || !is_null($row['banned'])) {
    echo json_encode(
        array(
            "success" => false,
            "message" => "Application is disabled or banned."
        )
    );
    exit();
}

$secret = $row['secret'];
$owner = $row['owner'];
$whitelist = trim((string)($row['sellerApiWhitelist'] ?? ''));

if (!empty($whitelist)) {
    $allowedIps = array_filter(array_map('trim', explode(',', $whitelist)));
    if (!in_array($clientIp, $allowedIps, true)) {
        echo json_encode(
            array(
                "success" => false,
                "message" => "Your IP is not whitelisted for Seller API."
            )
        );
        exit();
    }
}

if (misc\cache\rateLimit("KeyAuthDesktopBridge:$secret:$clientIp", 1, 60, 60)) {
    echo json_encode(
        array(
            "success" => false,
            "message" => "Too many requests. Try again in a minute."
        )
    );
    exit();
}

$_SESSION['role'] = 'seller';
$_SESSION['username'] = 'DesktopBridge';
$_SESSION['app'] = $secret;

if ($action === 'generate') {
    $amount = intval($_POST['amount'] ?? 1);
    $mask = misc\etc\sanitize($_POST['mask'] ?? '*****-*****-*****-*****-*****');
    $duration = intval($_POST['duration'] ?? 30);
    $expiry = intval($_POST['expiry'] ?? 86400);
    $level = intval($_POST['level'] ?? 1);
    $note = misc\etc\sanitize($_POST['note'] ?? '');
    $character = misc\etc\sanitize($_POST['character'] ?? null);

    $result = misc\license\createLicense($amount, $mask, $duration, $level, $note, $expiry, $secret, $owner, $character);

    if (!is_array($result)) {
        $map = array(
            'max_keys' => 'You can only generate 100 keys at a time.',
            'dupe_custom_key' => 'Mask without wildcard cannot be used with amount greater than 1.',
            'tester_limit' => 'Tester plan limit reached.',
            'no_negative' => 'Invalid amount.',
            'invalid_exp' => 'Invalid expiry unit.',
            'insufficient_balance' => 'Insufficient reseller balance.',
            'failure' => 'Failed to create license.'
        );
        $message = $map[$result] ?? ('Unhandled error: ' . $result);

        echo json_encode(
            array(
                "success" => false,
                "message" => $message
            )
        );
        exit();
    }

    echo json_encode(
        array(
            "success" => true,
            "message" => "Keys generated successfully.",
            "keys" => array_values($result)
        )
    );
    exit();
}

if ($action === 'list') {
    $limit = intval($_POST['limit'] ?? 200);
    if ($limit < 1) {
        $limit = 1;
    }
    if ($limit > 500) {
        $limit = 500;
    }

    $query = misc\mysql\query(
        "SELECT `key`, `status`, `usedby`, `expires`, `gendate`, `level`, `note` FROM `keys` WHERE `app` = ? ORDER BY `gendate` DESC LIMIT $limit",
        array($secret)
    );

    $rows = array();
    while ($r = mysqli_fetch_assoc($query->result)) {
        $rows[] = $r;
    }

    echo json_encode(
        array(
            "success" => true,
            "message" => "Keys fetched successfully.",
            "items" => $rows
        )
    );
    exit();
}

echo json_encode(
    array(
        "success" => false,
        "message" => "Unknown action."
    )
);
