import { Route, Routes, Navigate } from 'react-router-dom'
import {
  Home,
  Layout,
  LogIn,
  SignUp,
  CreateAgentProject,
  AgentChat,
  PromptStance,
  ProjectSettings,
  Integrations,
  OAuthCallback,
} from 'src/pages'
import { Dashboard } from 'src/pages/dashboard'
import { ChatDemo } from 'src/pages/chat-demo'
import { PageNotFound } from 'src/pages/page-not-found'
import { RequestPasswordReset } from 'src/pages/request-password-reset'
import { ResetPassword } from 'src/pages/reset-password'
import { AgentTasks } from 'src/pages/agent-tasks'
import { useAuth } from 'src/stores/auth'

const PrivateRoutes = () => {
  return (
    <>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/projects/">
        <Route index path=":id?" element={<CreateAgentProject />} />
        <Route path=":projectId/settings" element={<ProjectSettings />} />
        <Route path=":projectId/tasks" element={<AgentTasks />} />
      </Route>
      <Route path="/integrations" element={<Integrations />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />
      <Route path="/chat" element={<ChatDemo />} />
      <Route path="/chat/agent/:agentId" element={<AgentChat />} />
      {/* Legacy route - redirect to nested structure */}
      <Route path="/tasks/agent/:agentInstanceId" element={<Navigate to="/dashboard" />} />
    </>
  )
}

const AuthRoutes = () => {
  return (
    <>
      <Route path="/log-in" element={<LogIn />} />
      <Route path="/sign-up" element={<SignUp />} />
      <Route path="/request-reset" element={<RequestPasswordReset />} />
      <Route path="/password/reset/confirm/:userId/:token" element={<ResetPassword />} />
    </>
  )
}

export const AppRoutes = () => {
  const token = useAuth.use.token()
  const isAuth = Boolean(token)

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/home" />} />
        <Route path="/home" element={<Home />} />
        <Route path="/prompt-stance" element={<PromptStance />} />
        {isAuth ? PrivateRoutes() : AuthRoutes()}
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  )
}
