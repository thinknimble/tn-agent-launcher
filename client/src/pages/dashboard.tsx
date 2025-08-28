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
    <div className="flex min-h-full flex-1 flex-col">
      <header className="relative mx-auto flex h-32 w-full flex-col justify-center bg-primary sm:h-48">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-6 text-left text-3xl font-bold uppercase text-white">Dashboard</h1>
        </div>
      </header>
      <div className="h-full min-h-full p-4 sm:px-16 sm:py-4">
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-9">
          <Button
            variant="card"
            onClick={() => navigate('/projects/')}
            className="flex h-full flex-col items-center justify-center text-center text-gray-500"
          >
            <h2 className="text-xl font-bold">+</h2>
            <p>Create New Project</p>
          </Button>
          {projects?.results.map((project) => <ProjectCard key={project.id} project={project} />)}
        </div>
      </div>
    </div>
  )
}
