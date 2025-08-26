import { AgentProject } from 'src/services/agent-project/models'

export const ProjectCard = ({ project }: { project: AgentProject }) => {
  return (
    <div className="rounded-lg bg-white p-4 shadow-md">
      <h2 className="text-xl font-bold">{project.title}</h2>
      <p className="text-gray-500">{project.description}</p>
    </div>
  )
}
