export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm

nvm use 18

cd /Users/saschamayr/Projects/coinrotator

/Users/saschamayr/.yarn/bin/yarn run render-build >> ~/Desktop/cron.log 2>&1