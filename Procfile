# Main webapp process
web: PYTHONPATH=./server daphne -b 0.0.0.0 -p $PORT tn_agent_launcher.asgi:application

# Update DB schema for any changes
release: python server/manage.py migrate --noinput

worker: python server/manage.py process_tasks