import logging
import re
from typing import Any, Dict

from django.template import Context, Template
from django.template.exceptions import TemplateSyntaxError

from tn_agent_launcher.agent.models import ProjectEnvironmentSecret

logger = logging.getLogger(__name__)


def extract_variables_from_content(content: str) -> Dict[str, Any]:
    """
    Extract environment variables from content using {{VARIABLE_NAME}} pattern.

    Args:
        content: The text content to scan for variables

    Returns:
        Dictionary mapping variable names to metadata
    """
    if not content:
        return {}

    # Pattern to match {{VARIABLE_NAME}} - allows letters, numbers, underscores
    pattern = r"\{\{([A-Z_][A-Z0-9_]*)\}\}"
    matches = re.findall(pattern, content)

    # Create a dictionary with variable metadata
    variables = {}
    for var_name in set(matches):  # Use set to avoid duplicates
        variables[var_name] = {"name": var_name, "required": True, "type": "environment_secret"}

    return variables


def get_project_environment_variables(
    project_id: str, user_id: str, variable_names: list = None
) -> Dict[str, str]:
    """
    Retrieve environment variables for a project, filtered by variable names if provided.

    Args:
        project_id: The project ID to get variables for
        user_id: The user ID for access control
        variable_names: Optional list of variable names to filter by

    Returns:
        Dictionary mapping variable names to their decrypted values
    """
    try:
        # Get environment secrets for the project and user
        secrets = ProjectEnvironmentSecret.objects.filter(project_id=project_id, user_id=user_id)

        # Filter by variable names if provided
        if variable_names:
            secrets = secrets.filter(key__in=variable_names)

        # Build the context dictionary
        context = {}
        for secret in secrets:
            # Note: In a real implementation, you'd decrypt the secret.value here
            # For now, we're using the raw value (assuming it's not encrypted yet)
            context[secret.key] = secret.value

        return context

    except Exception as e:
        logger.error(f"Error retrieving environment variables for project {project_id}: {e}")
        return {}


def render_content_with_variables(
    content: str, variables: Dict[str, Any], project_id: str, user_id: str
) -> str:
    """
    Render content with environment variables resolved using Django's template system.

    Args:
        content: The template content with {{VARIABLE_NAME}} placeholders
        variables: Dictionary of variable metadata (from the variables JSON field)
        project_id: Project ID for fetching environment secrets
        user_id: User ID for access control

    Returns:
        Rendered content with variables substituted
    """
    if not content or not variables:
        return content

    try:
        # Get the variable names from the variables metadata
        variable_names = list(variables.keys())

        # Fetch the actual environment variable values
        env_context = get_project_environment_variables(project_id, user_id, variable_names)

        # Create Django template and context
        template = Template(content)
        context = Context(env_context)

        # Render the template
        rendered_content = template.render(context)

        # Log any missing variables
        missing_vars = set(variable_names) - set(env_context.keys())
        if missing_vars:
            logger.warning(
                f"Missing environment variables for project {project_id}: {missing_vars}"
            )

        return rendered_content

    except TemplateSyntaxError as e:
        logger.error(f"Template syntax error in content: {e}")
        return content  # Return original content if template is invalid

    except Exception as e:
        logger.error(f"Error rendering content with variables: {e}")
        return content  # Return original content on any error


def render_prompt_template_content(
    prompt_template, project_id: str = None, user_id: str = None
) -> str:
    """
    Render a PromptTemplate's content with environment variables resolved.

    Args:
        prompt_template: PromptTemplate instance
        project_id: Optional project ID for environment variables
        user_id: Optional user ID for access control

    Returns:
        Rendered content with variables substituted
    """
    if not prompt_template:
        return ""

    # If no project/user provided, try to get from the prompt template's agent instance
    if not project_id and prompt_template.agent_instance:
        # Get the first project associated with the agent instance
        first_project = prompt_template.agent_instance.projects.first()
        if first_project:
            project_id = str(first_project.id)
            user_id = str(prompt_template.agent_instance.user.id)

    if not project_id or not user_id:
        return prompt_template.content

    return render_content_with_variables(
        prompt_template.content, prompt_template.variables or {}, project_id, user_id
    )


def render_agent_task_instruction(agent_task, project_id: str = None, user_id: str = None) -> str:
    """
    Render an AgentTask's instruction with environment variables resolved.

    Args:
        agent_task: AgentTask instance
        project_id: Optional project ID for environment variables
        user_id: Optional user ID for access control

    Returns:
        Rendered instruction with variables substituted
    """
    if not agent_task:
        return ""

    # If no project/user provided, try to get from the agent task's agent instance
    if not project_id and agent_task.agent_instance:
        # Get the first project associated with the agent instance
        first_project = agent_task.agent_instance.projects.first()
        if first_project:
            project_id = str(first_project.id)
            user_id = str(agent_task.agent_instance.user.id)

    if not project_id or not user_id:
        return agent_task.instruction

    return render_content_with_variables(
        agent_task.instruction, agent_task.variables or {}, project_id, user_id
    )


def validate_variables_in_content(
    content: str, available_variables: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Validate that all variables used in content are available.

    Args:
        content: The content to validate
        available_variables: Dictionary of available variables

    Returns:
        Dictionary with validation results
    """
    used_variables = extract_variables_from_content(content)
    available_var_names = set(available_variables.keys())
    used_var_names = set(used_variables.keys())

    missing_variables = used_var_names - available_var_names
    unused_variables = available_var_names - used_var_names

    return {
        "valid": len(missing_variables) == 0,
        "used_variables": list(used_var_names),
        "missing_variables": list(missing_variables),
        "unused_variables": list(unused_variables),
        "total_variables": len(used_var_names),
    }
