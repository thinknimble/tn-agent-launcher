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
      <div className="group flex min-h-[200px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl transition-all hover:shadow-2xl hover:-translate-y-2">
        <div className="bg-gradient-to-br from-primary to-primary-700 p-6">
          <h2 className="text-xl font-bold text-white">{project.title}</h2>
        </div>
        <div className="flex-1 p-6">
          <p className="text-primary-400">{project.description}</p>
        </div>
      </div>
    </Link>
  )
}
