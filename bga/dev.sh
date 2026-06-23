#!/usr/bin/env bash
# Local lint + unit tests for the River Bankers BGA port.
# Requires: node, php-cli, composer  (sudo apt install php-cli composer unzip)
set -euo pipefail
cd "$(dirname "$0")"

[ -d vendor ] || composer install

echo "== regenerate auction fixture from the sim.js oracle =="
node tests/oracle/gen_auction_vectors.js > tests/fixtures/auction_vectors.json

echo "== php -l (syntax) =="
find modules/php -name '*.php' -print0 | xargs -0 -n1 php -l >/dev/null && echo "syntax OK"

echo "== phpstan (static analysis) =="
vendor/bin/phpstan analyse --no-progress

echo "== phpunit =="
vendor/bin/phpunit
