# The token arrives as CLOUDFLARE_API_TOKEN, a sensitive environment variable on
# the workspace. It is minted in bendrucker/infrastructure and scoped to this
# zone alone, so nothing here needs an explicit credential.
provider "cloudflare" {}
