import { useNavigate } from 'react-router-dom'

export const CreateProjectCard = () => {
  const navigate = useNavigate()
  return (
    <div
      className="flex cursor-pointer items-center justify-center rounded-lg bg-white p-4 shadow-md hover:bg-gray-100"
      onClick={() => navigate('/projects/')}
    >
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-500">+</h2>
        <p className="text-gray-500">Create New Project</p>
      </div>
    </div>
  )
}
