import { atom } from 'jotai'
import { AgentProject } from 'src/services/agent-project'

export const projectAtom = atom<AgentProject | null>(null)
