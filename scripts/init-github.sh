#!/bin/bash

#
# Creating tn_agent_launcher git repo
#
git init
git add .
git commit -m "Initial commit"
# git remote add origin git@github.com:thinknimble/tn_agent_launcher.git
gh repo create thinknimble/tn_agent_launcher --private -y
git push origin main
printf "\033[0;32mRepo https://github.com/thinknimble/tn_agent_launcher/\033[0m \n"
