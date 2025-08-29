import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from './button'
import { Textarea } from './textarea'

interface PromptBuilderProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

interface StanceSection {
  id: string
  title: string
  shortTitle: string
  length: string
  helper: {
    sections: Array<{
      title: string
      points: string[]
    }>
  }
  placeholder: string
}

const stanceSections: StanceSection[] = [
  {
    id: 'stance1',
    title: 'Tools Before Thinking',
    shortTitle: 'Tools Before Thinking',
    length: '3-5 sentences',
    helper: {
      sections: [
        {
          title: 'Start with Your Inputs and Outputs',
          points: [
            'What format are you starting with? (emails, data, meeting notes, research topics)',
            'What outcome do you want? (bullet points, full report, decision matrix)',
            'What pattern should it follow? (your template, your style guide)',
          ],
        },
        {
          title: 'Identify Tool vs Taste Tasks',
          points: [
            'Tool tasks: expense categorization, data formatting, checklist completion',
            'Taste tasks: abstract processes, comparing alternatives, creative synthesis',
            'Push everything possible into the tool category first',
          ],
        },
      ],
    },
    placeholder: 'Define your inputs, outputs, and which tasks can be handled by tools...',
  },
  {
    id: 'stance2',
    title: 'Document Your Process',
    shortTitle: 'Document Your Process',
    length: '5-8 bullet points',
    helper: {
      sections: [
        {
          title: 'Break Apart the Task into Subtasks',
          points: [
            'List every step you actually do (not what you think you do)',
            'Mark which steps are mechanical (pull data, format, organize)',
            'Mark which steps need judgment (synthesize, decide, create)',
          ],
        },
        {
          title: 'Get Specific About Structure',
          points: [
            'Format: How should it look?',
            'Length: How long should it be?',
            'Structure: What order should information appear?',
            'Call out which subtasks could be their own tool-calling agent',
          ],
        },
      ],
    },
    placeholder: 'Document each step of your process and specify the exact structure...',
  },
  {
    id: 'stance3',
    title: "Show, Don't Explain",
    shortTitle: "Show, Don't Explain",
    length: '2-3 examples',
    helper: {
      sections: [
        {
          title: 'Show What Good Looks Like',
          points: [
            'Feed it your best examples, not your criteria',
            'Include examples that worked AND examples that failed',
            'Point out what made them good or bad',
          ],
        },
        {
          title: 'Let the Agent Self-Evaluate',
          points: [
            'What triggers a redo vs good enough?',
            "How should it know when it's succeeding?",
            'Build in "this needs review" flags instead of confident bullshit',
          ],
        },
      ],
    },
    placeholder: 'Provide examples of good and bad outputs, and self-evaluation criteria...',
  },
  {
    id: 'stance4',
    title: 'Make Patterns Visible',
    shortTitle: 'Make Patterns Visible',
    length: '4-6 style rules',
    helper: {
      sections: [
        {
          title: 'Define Your Working Style',
          points: [
            'Cadence: Quick and punchy or detailed and thorough?',
            'Depth: Two examples to compare or one deep dive?',
            'Research style: Competitive analysis or cross-industry patterns?',
            'Thinking style: Build up from principles or break down from big ideas?',
          ],
        },
        {
          title: 'Name Your Frameworks',
          points: [
            'What mental models do you always use? (MECE, Jobs to Be Done, First Principles)',
            "Who's your audience? (boss wants confidence, team wants options)",
            'Do you define success upfront or evaluate reasoning after?',
          ],
        },
      ],
    },
    placeholder: 'Define your working style, mental models, and frameworks...',
  },
  {
    id: 'stance5',
    title: "Grade, Don't Generate",
    shortTitle: "Grade, Don't Generate",
    length: '3-4 decision rules',
    helper: {
      sections: [
        {
          title: 'Set Clear Decision Rules',
          points: [
            'When should the agent act independently?',
            'When should it call you in?',
            'When should it make a determination and move forward?',
          ],
        },
        {
          title: 'Build Reflection Loops',
          points: [
            'After each result: Is this good enough?',
            'What gaps still need filling?',
            "What's the next optimal action?",
            'Use this reflection to inform the next step, not rewrite everything',
          ],
        },
      ],
    },
    placeholder: 'Define decision rules and reflection loops for evaluation...',
  },
  {
    id: 'stance6',
    title: 'Design the Organization',
    shortTitle: 'Design the Organization',
    length: '4-5 boundaries',
    helper: {
      sections: [
        {
          title: 'Define Boundaries',
          points: [
            'Scope: "You only handle X, not Y"',
            'Escalation: When to punt to legal/finance/human',
            "Failure points: Won't ask for prioritization (but should)",
            'Time limits: "Spend max 30 minutes on this"',
          ],
        },
        {
          title: 'Design the Handoffs',
          points: [
            'Who hands off to whom?',
            'What triggers a handoff?',
            'What information gets passed along?',
            "How do specialists communicate what they couldn't do?",
          ],
        },
      ],
    },
    placeholder: 'Define boundaries, escalation paths, and handoff procedures...',
  },
]

export const PromptBuilder = ({ value, onChange, placeholder }: PromptBuilderProps) => {
  const [isImprovePromptActive, setIsImprovePromptActive] = useState(false)
  const [selectedStances, setSelectedStances] = useState<Set<string>>(new Set())
  const [stanceContents, setStanceContents] = useState<Record<string, string>>({})
  const [expandedHelpers, setExpandedHelpers] = useState<Set<string>>(new Set())

  const toggleImprovePrompt = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setIsImprovePromptActive(!isImprovePromptActive)
    if (isImprovePromptActive) {
      setSelectedStances(new Set())
      setStanceContents({})
    }
  }

  const toggleStance = (stanceId: string) => {
    const newSelected = new Set(selectedStances)
    if (newSelected.has(stanceId)) {
      newSelected.delete(stanceId)
      const newContents = { ...stanceContents }
      delete newContents[stanceId]
      setStanceContents(newContents)
    } else {
      newSelected.add(stanceId)
    }
    setSelectedStances(newSelected)
  }

  const updateStanceContent = (stanceId: string, content: string) => {
    setStanceContents({
      ...stanceContents,
      [stanceId]: content,
    })
  }

  const toggleHelper = (stanceId: string) => {
    const newExpanded = new Set(expandedHelpers)
    if (newExpanded.has(stanceId)) {
      newExpanded.delete(stanceId)
    } else {
      newExpanded.add(stanceId)
    }
    setExpandedHelpers(newExpanded)
  }

  const generatePrompt = () => {
    const prompts = Array.from(selectedStances)
      .map((stanceId) => stanceContents[stanceId])
      .filter((content) => content?.trim())

    if (prompts.length > 0) {
      const combinedPrompt = prompts.join('\n\n---\n\n')
      onChange(combinedPrompt)
    }
  }

  const clearAll = () => {
    setSelectedStances(new Set())
    setStanceContents({})
    setExpandedHelpers(new Set())
    onChange('')
  }

  const selectedStancesArray = Array.from(selectedStances)
    .map((id) => stanceSections.find((s) => s.id === id))
    .filter(Boolean) as StanceSection[]

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-7 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-neutral-900">System Prompt</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Create better agent prompts with systematic design principles
            </p>
          </div>
          <Button
            link={{ to: '/prompt-stance' }}
            variant="unstyled"
            icon={
              <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            }
          >
            Our stance on prompts
          </Button>
        </div>
      </div>

      <div className="px-7 py-6">
        <div className="mb-4 min-h-[120px] rounded-lg border border-gray-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
          {value || 'Your system prompt will appear here...'}
        </div>

        <div className="mb-6 flex gap-2">
          <Button
            onClick={toggleImprovePrompt}
            variant={isImprovePromptActive ? 'primary' : 'neutral'}
            className={isImprovePromptActive ? 'bg-neutral-900' : ''}
            icon={
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L13.09 8.26L19 7L15.45 11.82L21 16L14.5 16L12 22L9.5 16L3 16L8.55 11.82L5 7L10.91 8.26L12 2Z" />
              </svg>
            }
          >
            Improve Prompt
          </Button>
        </div>

        {isImprovePromptActive && (
          <div className="animate-in fade-in mb-6 rounded-lg border border-gray-200 bg-neutral-50 p-5 duration-200">
            <div className="mb-4 text-sm font-semibold text-neutral-900">
              Select principles to apply:
            </div>

            <div className="space-y-3">
              {stanceSections.map((stance, index) => (
                <label
                  key={stance.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md p-2 transition-colors hover:bg-white"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-neutral-900 focus:ring-neutral-900"
                    checked={selectedStances.has(stance.id)}
                    onChange={() => toggleStance(stance.id)}
                  />
                  <div className="flex-1 text-sm leading-relaxed">
                    <span className="font-medium text-neutral-900">
                      {index + 1}. {stance.shortTitle}
                    </span>
                    <span className="ml-2 text-neutral-600">
                      -{' '}
                      {stance.title === stance.shortTitle
                        ? stance.id === 'stance1'
                          ? 'Exhaust tools before reasoning'
                          : stance.id === 'stance2'
                            ? 'Make creative steps explicit'
                            : stance.id === 'stance3'
                              ? 'Let AI spot patterns from examples'
                              : stance.id === 'stance4'
                                ? 'Define your consistent style'
                                : stance.id === 'stance5'
                                  ? 'Use AI for evaluation'
                                  : 'Structure agent handoffs'
                        : stance.title}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {selectedStancesArray.length > 0 && (
          <div className="mb-6 space-y-5">
            {selectedStancesArray.map((stance, index) => (
              <div key={stance.id} className="rounded-lg border border-gray-200 bg-neutral-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-gray-200 bg-white text-xs font-medium text-neutral-600">
                        {index + 1}
                      </span>
                      {stance.title}
                    </div>
                    <div className="mt-0.5 text-xs text-neutral-500">
                      Suggested: {stance.length}
                    </div>
                  </div>
                  <Button
                    onClick={() => toggleHelper(stance.id)}
                    variant="neutral"
                    className="bg-transparent px-2 py-1 text-xs text-neutral-600 hover:bg-white hover:text-neutral-900"
                  >
                    {expandedHelpers.has(stance.id) ? 'Hide tips' : 'Show tips'}
                  </Button>
                </div>

                {expandedHelpers.has(stance.id) && (
                  <div className="mb-3 rounded border-l-2 border-gray-200 bg-white p-3 text-xs leading-relaxed text-neutral-600">
                    {stance.helper.sections.map((section, idx) => (
                      <div key={idx} className={idx > 0 ? 'mt-3' : ''}>
                        <h4 className="mb-1.5 text-xs font-semibold text-neutral-900">
                          {section.title}
                        </h4>
                        <ul className="ml-4 space-y-0.5">
                          {section.points.map((point, pointIdx) => (
                            <li key={pointIdx} className="list-disc">
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                <Textarea
                  placeholder={stance.placeholder}
                  value={stanceContents[stance.id] || ''}
                  onChange={(e) => updateStanceContent(stance.id, e.target.value)}
                  className="resize-vertical font-inherit min-h-[100px] w-full rounded-md border border-gray-200 bg-white p-3 text-sm placeholder-neutral-400 transition-colors focus:border-neutral-400 focus:outline-none"
                />
              </div>
            ))}
          </div>
        )}

        {!isImprovePromptActive && (
          <Textarea
            placeholder={placeholder || 'Enter the system prompt for this agent...'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="resize-vertical font-inherit min-h-[120px] w-full rounded-md border border-gray-200 bg-white p-3 text-sm placeholder-neutral-400 transition-colors focus:border-neutral-400 focus:outline-none"
          />
        )}

        {(isImprovePromptActive || selectedStancesArray.length > 0) && (
          <div className="flex justify-end gap-2 border-t border-gray-200 pt-5">
            <Button onClick={clearAll} variant="neutral">
              Clear
            </Button>
            <Button
              onClick={generatePrompt}
              variant="primary"
              className="border border-neutral-900 bg-neutral-900"
            >
              Generate Prompt
            </Button>
          </div>
        )}

        {!isImprovePromptActive && (
          <p className="mt-2 text-xs text-neutral-400">
            Define the behavior and personality of your AI agent
          </p>
        )}
      </div>
    </div>
  )
}
