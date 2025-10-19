import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from 'src/components/button'
import { ProjectCard } from 'src/components/project-card'
import { agentProjectQueries } from 'src/services/agent-project'
import { Pagination } from '@thinknimble/tn-models'

export const Dashboard = () => {
  const navigate = useNavigate()
  const { data: projects } = useQuery(agentProjectQueries.list(new Pagination()))

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-gradient-to-br from-primary to-primaryLight">
      <header className="relative mx-auto flex w-full flex-col justify-center px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <h1 className="mb-3 text-left text-4xl font-extrabold text-white drop-shadow-lg sm:text-5xl">
            Your Projects
          </h1>
          <p className="text-lg text-white/80">
            Manage your AI agents and automated workflows
          </p>
        </div>
      </header>
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Button
            onClick={() => navigate('/projects/')}
            className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/30 bg-white/10 p-8 text-center backdrop-blur-md transition-all hover:border-accent hover:bg-white/15 hover:shadow-2xl hover:-translate-y-1"
          >
            <div className="mb-3 text-5xl">+</div>
            <p className="font-semibold text-white">Create New Project</p>
          </Button>
          {projects?.results.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </div>
  )
}
