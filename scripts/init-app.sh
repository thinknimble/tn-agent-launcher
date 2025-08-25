#!/bin/bash

# tn-agent-launcher Intialization
#

# Applying the migrations
# Generating client app
npm install --prefix client && npm run build --prefix client
uv sync
uv run python server/manage.py makemigrations && uv run python server/manage.py migrate
source .venv/bin/activate && ./server/runserver.sh
