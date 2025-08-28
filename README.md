[![Built with Cookiecutter](https://img.shields.io/badge/built%20with-Cookiecutter-ff69b4.svg?logo=cookiecutter)](https://github.com/cookiecutter/cookiecutter)

# TN Agent Launcher

## About

### Why Us

We've spent a decade and a half building software for people who do everything from running nonprofits to moving millions in payments to wrangling spreadsheets that look like they were designed as a form of punishment. What jumps out after you've built enough of these is how the same patterns keep showing up. The work people actually want to do is buried under the work they have to do. We're good at seeing those patterns, and we're even better at translating solutions from one domain to another. If there's a way to make the annoying parts go away, we'll find it. For years, we've applied traditional software tools to those problems, and now we're using the newest tool in our toolbelt – AI.

### What We're Doing Here

We're putting our own jobs under a microscope and asking, "What could we automate out of existence?" There's a reason we chose this career, and a lot of our time is not spent on things we could talk about at parties (trust me, eyes gloss over at the mention of the perfect Jira ticket structure). What we want to work on is the hard questions, the pattern we saw in user journeys between two totally different industries, the way one product hit its market and took off. There's a lot of things we could work on in a day, and we want to spend more time on the stuff in our zone of genius. We've been building things behind the scenes for dozens of companies in the last 15 years, and we want to take this opportunity to publicly build our replacement Agency. We're starting with a launcher for agents—tools that pick up the grunt work so we can spend more time on the parts that actually matter. And we're doing it in public, in this repo, so anyone can see how we're thinking, what we're testing, and what actually works.

### Why This Thing

AI that works is about frameworks, templates, and blueprints that anyone can use. Our team is a set of expert generalists. We are excellent at finding the right tool for the job, and noticing when a job happens over and over. Because we are extremely comfortable in the world of tech, using AI as the newest tool in our toolbelt feels like second nature. We've noticed in working with clients in the last year, though, that not everyone feels that way (duh). Our goal is to build something anyone can use the next time they hit a repetitive task. If you're not a developer, you shouldn't need to learn five new tools just to automate something basic. Most people aren't going to touch a command line, so we're making sure this works for the rest of us, too. We want this to work for the person who's never opened a terminal, and for the person who lives in one. Our goal is to create something that seamlessly extracts the job to be done, creates a system to make sure that job is done correctly, measures how effectively you feel that job was done, and then does that job forever, well. That way, you can do the things that matter to you.

### Why You Should Care

Jobs are a big part of how we define ourselves. You probably didn't sign up for your role because you love moving data from A to B or filling out forms. You wanted to make a difference, see your skills shine, work with people you respect. The reality is, most days, the stuff that made you excited about the job gets buried. We're trying to flip that ratio. If we do this right, you get more time for the work that makes you proud and less time for the stuff that makes you roll your eyes. And you can see it all unfold, right here, the proof in the repo pudding (that's a metaphor, right?).

### Where to Start

We're starting by building the tool we'll use to automate as much of our jobs at the Agency as possible. We're working on applying this tool to our Agency, listing out every workflow we touch in a normal week. We're starting with the things that take the least magic and the most time, and documenting every step. We're taking what works, and applying it to our stances for how to build a good agent.

We plan to document what makes for good automation, how we're evaluating the usefulness of agents, and how we're setting up a system of agents to work well together. We're building a feedback loop between these projects to automate, test, refine, abstract, and repeat. If you want to follow along, clone the repo, try it out, or just watch us work. The whole point is to make this accessible, transparent, and—hopefully—a little bit inspiring.

## Setup

### Docker

If this is your first time...

1. [Install Docker](https://www.docker.com/)
1. Run `uv sync` to generate a uv.lock
1. Run `cd client && npm install` so you have node_modules available outside of Docker
1. Back in the root directory, run `just docker-run-all`
1. If the DB is new, run `just create-test-data`
   1. SuperUser `admin@thinknimble.com` with credentials from your `.env`
   1. User `playwright@thinknimble.com` with credentials from your `.env` is used by the Playwright
      tests
1. View other available scripts/commands with `just`
1. `localhost:8080` to view the app.
1. `localhost:8000/staff/` to log into the Django admin
1. `localhost:8000/api/docs/` to view backend API endpoints available for frontend development

### Backend

If not using Docker...
See the [backend README](server/README.md)

### Frontend

If not using Docker...
See the [frontend README](client/README.md)

## Pre-commit Hooks

This project uses pre-commit hooks to ensure code quality and consistency. The hooks will automatically run before each commit to check for issues.

### Setup

1. Install pre-commit hooks: `uv run pre-commit install`
2. (Optional) Run hooks manually on all files: `uv run pre-commit run --all-files`

The pre-commit configuration includes:
- Python linting and formatting with Ruff
- Frontend linting with ESLint and Prettier
- TypeScript type checking
- General checks (trailing whitespace, YAML/JSON validation, etc.)

## Testing & Linting Locally

1. `uv sync`
1. `uv run pytest server`
1. `uv run black server`
1. `uv run isort server --diff` (shows you what isort is expecting)

## Frontend E2E Testing with Playwright

1. `cd client`
1. `npx playwright install` - Installs browser driver
1. `npx playwright install-deps` - Install system-level dependencies
1. `npx playwright test`
1. `npx playwright codegen localhost:8080` - Generate your tests through manual testing
