import { useSetAtom } from 'jotai'
import { Link, useNavigate } from 'react-router-dom'
import { AgentProject } from 'src/services/agent-project/models'
import { projectAtom } from 'src/stores/project-atom'

export const ProjectCard = ({ project }: { project: AgentProject }) => {
  const setProjectAtom = useSetAtom(projectAtom)

  const navigate = useNavigate()

  const handleClick = (project: AgentProject) => {
    setProjectAtom(project)
  }

  return (
    <Link onClick={() => handleClick(project)} to={`/projects/${project.id}`}>
      <div className="rounded-lg bg-white p-4 shadow-md">
        <h2 className="text-xl font-bold">{project.title}</h2>
        <p className="text-gray-500">{project.description}</p>
      </div>
    </Link>
  )
}
