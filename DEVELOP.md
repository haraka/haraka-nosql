
# First Time Installation

## Install Global binaries

    sudo npm install -g mocha jshint grunt-cli


# Publish New Version

1. Update version in package.json
    * $EDITOR package.json
2. Check dependency versions, update if safe and necessary
    * grunt versioncheck
3. Publish to NPM
    * npm publish
