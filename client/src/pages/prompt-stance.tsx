import { useNavigate } from 'react-router-dom'
import { Button } from 'src/components/button'
import { useState } from 'react'

export const PromptStance = () => {
  const navigate = useNavigate()
  const [expandedSections, setExpandedSections] = useState<number[]>([])

  const toggleSection = (sectionNumber: number) => {
    setExpandedSections(prev => 
      prev.includes(sectionNumber) 
        ? prev.filter(n => n !== sectionNumber)
        : [...prev, sectionNumber]
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            className="mb-4 border-primary-300 text-primary-600 hover:bg-primary-100"
          >
            ← Back
          </Button>
        </div>

        <div className="space-y-16">
          {/* Header Section */}
          <div className="header mb-16">
            <span className="inline-block bg-black text-white px-4 py-2 rounded text-sm font-semibold mb-5 tracking-wide">
              BATTLE-TESTED METHODOLOGY
            </span>
            <h1 className="text-5xl font-extrabold leading-tight mb-5 text-black">
              Why Our Agent Builder Works
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed mb-10">
              We didn't read papers and theorize. We've built agents, orchestrated teams of agents, failed, and improved. 
              We're constantly learning from people on the bleeding edge of building these tools, and working to translate 
              them to a workbench for everyday use.
            </p>
          </div>

          {/* Research Banner */}
          <div className="bg-black text-white p-8 rounded-xl mb-16">
            <h3 className="text-lg font-bold mb-3">Validated by People Who Actually Ship</h3>
            <p className="mb-6">
              Deeply researched and implemented work from the smartest minds in AI right now, turned everyday actionable. 
              Some folks we follow, who have helped us improve our failures.
            </p>
            <div className="flex flex-wrap gap-3">
              {['Anthropic Engineers', 'OpenAI\'s Internal Tooling', 'Lenny\'s Newsletter Community', 'Every.to Builders', 'A16Z Portfolio Teams', 'Simon Willison\'s Experiments'].map((source) => (
                <span key={source} className="bg-white bg-opacity-20 px-4 py-2 rounded text-sm border border-white border-opacity-30">
                  {source}
                </span>
              ))}
            </div>
          </div>

          {/* Stance 1 */}
          <div className="stance-section">
            <div className="flex items-start mb-8">
              <div className="bg-black text-white w-10 h-10 rounded-full flex items-center justify-center font-bold mr-5 flex-shrink-0">
                1
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-2 leading-tight">
                  Agents should exhaust their tools before they start thinking.
                </h2>
                <p className="text-lg text-gray-600 italic">
                  Reasoning is what happens when you failed to build the right tool.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 border-l-4 border-black rounded-r-lg overflow-hidden mb-8">
              <div 
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleSection(1)}
              >
                <h4 className="text-sm uppercase tracking-wide text-black font-semibold">
                  RESEARCH WE BUILD ON
                </h4>
                <span className={`text-lg transition-transform ${expandedSections.includes(1) ? 'rotate-90' : ''}`}>
                  →
                </span>
              </div>
              {expandedSections.includes(1) && (
                <div className="px-5 pb-5">
                  <p className="text-gray-500 italic">Coming soon</p>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-8">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                <span className="text-2xl">⚡</span>
                How to Implement
              </h3>

              <div className="mb-8">
                <h4 className="font-bold text-black mb-3">Start with Your Inputs and Outputs</h4>
                <ul className="space-y-2">
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">
                      What format are you starting with? <span className="text-gray-500 italic">(emails, data, meeting notes, research topics)</span>
                    </span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">
                      What outcome do you want? <span className="text-gray-500 italic">(bullet points, full report, decision matrix)</span>
                    </span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">
                      What pattern should it follow? <span className="text-gray-500 italic">(your template, your style guide)</span>
                    </span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-black mb-3">Identify Tool vs Taste Tasks</h4>
                <ul className="space-y-2">
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Tool tasks: expense categorization, data formatting, checklist completion</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Taste tasks: abstract processes, comparing alternatives, creative synthesis</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Push everything possible into the tool category first</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">If it has clear rules and patterns, it's a tool task</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">If it requires nuanced judgment or creative leaps, it's a taste task</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-200"></div>

          {/* Stance 2 */}
          <div className="stance-section">
            <div className="flex items-start mb-8">
              <div className="bg-black text-white w-10 h-10 rounded-full flex items-center justify-center font-bold mr-5 flex-shrink-0">
                2
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-2 leading-tight">
                  Your 'creative process' is just undocumented steps you're too precious about.
                </h2>
                <p className="text-lg text-gray-600 italic">
                  Document them and anyone can be creative like you.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 border-l-4 border-black rounded-r-lg overflow-hidden mb-8">
              <div 
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleSection(2)}
              >
                <h4 className="text-sm uppercase tracking-wide text-black font-semibold">
                  RESEARCH WE BUILD ON
                </h4>
                <span className={`text-lg transition-transform ${expandedSections.includes(2) ? 'rotate-90' : ''}`}>
                  →
                </span>
              </div>
              {expandedSections.includes(2) && (
                <div className="px-5 pb-5">
                  <p className="text-gray-500 italic">Coming soon</p>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-8">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                <span className="text-2xl">⚡</span>
                How to Implement
              </h3>

              <div className="mb-8">
                <h4 className="font-bold text-black mb-3">Break Apart the Task into Subtasks</h4>
                <ul className="space-y-2">
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">List every step you actually do (not what you think you do)</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">
                      Mark which steps are mechanical <span className="text-gray-500 italic">(pull data, format, organize)</span>
                    </span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">
                      Mark which steps need judgment <span className="text-gray-500 italic">(synthesize, decide, create)</span>
                    </span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Be honest about what's actually creative vs. what's just following a pattern you haven't admitted to yourself</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-black mb-3">Get Specific About Structure</h4>
                <ul className="space-y-2">
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Format: How should it look?</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Length: How long should it be?</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Structure: What order should information appear?</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Call out which subtasks could be their own tool-calling agent</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Define what "done" looks like for each subtask</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-200"></div>

          {/* Stance 3 */}
          <div className="stance-section">
            <div className="flex items-start mb-8">
              <div className="bg-black text-white w-10 h-10 rounded-full flex items-center justify-center font-bold mr-5 flex-shrink-0">
                3
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-2 leading-tight">
                  The AI is better at spotting patterns in your work than you are at describing them.
                </h2>
                <p className="text-lg text-gray-600 italic">
                  Stop explaining, start showing.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 border-l-4 border-black rounded-r-lg overflow-hidden mb-8">
              <div 
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleSection(3)}
              >
                <h4 className="text-sm uppercase tracking-wide text-black font-semibold">
                  RESEARCH WE BUILD ON
                </h4>
                <span className={`text-lg transition-transform ${expandedSections.includes(3) ? 'rotate-90' : ''}`}>
                  →
                </span>
              </div>
              {expandedSections.includes(3) && (
                <div className="px-5 pb-5">
                  <p className="text-gray-500 italic">Coming soon</p>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-8">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                <span className="text-2xl">⚡</span>
                How to Implement
              </h3>

              <div className="mb-8">
                <h4 className="font-bold text-black mb-3">Show What Good Looks Like</h4>
                <ul className="space-y-2">
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Feed it your best examples, not your criteria</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Include examples that worked AND examples that failed</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Point out what made them good or bad</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">The more examples you provide, the better it understands your taste</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Examples beat instructions every single time</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-black mb-3">Let the Agent Self-Evaluate</h4>
                <ul className="space-y-2">
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">What triggers a redo vs good enough?</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">How should it know when it's succeeding?</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Build in "this needs review" flags instead of confident bullshit</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Give it permission to say "I'm not sure about this part"</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Define clear success metrics it can check against</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-200"></div>

          {/* Stance 4 */}
          <div className="stance-section">
            <div className="flex items-start mb-8">
              <div className="bg-black text-white w-10 h-10 rounded-full flex items-center justify-center font-bold mr-5 flex-shrink-0">
                4
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-2 leading-tight">
                  Your thinking style is more consistent than you realize.
                </h2>
                <p className="text-lg text-gray-600 italic">
                  Making your invisible patterns visible is where the actual magic happens.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 border-l-4 border-black rounded-r-lg overflow-hidden mb-8">
              <div 
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleSection(4)}
              >
                <h4 className="text-sm uppercase tracking-wide text-black font-semibold">
                  RESEARCH WE BUILD ON
                </h4>
                <span className={`text-lg transition-transform ${expandedSections.includes(4) ? 'rotate-90' : ''}`}>
                  →
                </span>
              </div>
              {expandedSections.includes(4) && (
                <div className="px-5 pb-5">
                  <p className="text-gray-500 italic">Coming soon</p>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-8">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                <span className="text-2xl">⚡</span>
                How to Implement
              </h3>

              <div className="mb-8">
                <h4 className="font-bold text-black mb-3">Define Your Working Style</h4>
                <ul className="space-y-2">
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Cadence: Quick and punchy or detailed and thorough?</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Depth: Two examples to compare or one deep dive?</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Research style: Competitive analysis or cross-industry patterns?</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Thinking style: Build up from principles or break down from big ideas?</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Presentation style: Data-first or narrative-first?</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-black mb-3">Name Your Frameworks</h4>
                <ul className="space-y-2">
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">
                      What mental models do you always use? <span className="text-gray-500 italic">(MECE, Jobs to Be Done, First Principles)</span>
                    </span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">
                      Who's your audience? <span className="text-gray-500 italic">(boss wants confidence, team wants options)</span>
                    </span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Do you define success upfront or evaluate reasoning after?</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">What questions do you always ask yourself?</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">What's your go-to structure for presenting ideas?</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-200"></div>

          {/* Stance 5 */}
          <div className="stance-section">
            <div className="flex items-start mb-8">
              <div className="bg-black text-white w-10 h-10 rounded-full flex items-center justify-center font-bold mr-5 flex-shrink-0">
                5
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-2 leading-tight">
                  Agents should grade your work, not do your work.
                </h2>
                <p className="text-lg text-gray-600 italic">
                  Human creation with AI evaluation beats the hell out of AI creation with human editing.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 border-l-4 border-black rounded-r-lg overflow-hidden mb-8">
              <div 
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleSection(5)}
              >
                <h4 className="text-sm uppercase tracking-wide text-black font-semibold">
                  RESEARCH WE BUILD ON
                </h4>
                <span className={`text-lg transition-transform ${expandedSections.includes(5) ? 'rotate-90' : ''}`}>
                  →
                </span>
              </div>
              {expandedSections.includes(5) && (
                <div className="px-5 pb-5">
                  <p className="text-gray-500 italic">Coming soon</p>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-8">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                <span className="text-2xl">⚡</span>
                How to Implement
              </h3>

              <div className="mb-8">
                <h4 className="font-bold text-black mb-3">Set Clear Decision Rules</h4>
                <ul className="space-y-2">
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">When should the agent act independently?</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">When should it call you in?</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">When should it make a determination and move forward?</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">What decisions are reversible vs irreversible?</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">What's the cost of being wrong vs the cost of waiting?</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-black mb-3">Build Reflection Loops</h4>
                <ul className="space-y-2">
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">After each result: Is this good enough?</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">What gaps still need filling?</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">What's the next optimal action?</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Use this reflection to inform the next step, not rewrite everything</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Build in checkpoints, not endless revision cycles</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-200"></div>

          {/* Stance 6 */}
          <div className="stance-section">
            <div className="flex items-start mb-8">
              <div className="bg-black text-white w-10 h-10 rounded-full flex items-center justify-center font-bold mr-5 flex-shrink-0">
                6
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-2 leading-tight">
                  Agent orchestration is just org design.
                </h2>
                <p className="text-lg text-gray-600 italic">
                  Most people have never designed a good org, which is why their agents are also chaos.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 border-l-4 border-black rounded-r-lg overflow-hidden mb-8">
              <div 
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleSection(6)}
              >
                <h4 className="text-sm uppercase tracking-wide text-black font-semibold">
                  RESEARCH WE BUILD ON
                </h4>
                <span className={`text-lg transition-transform ${expandedSections.includes(6) ? 'rotate-90' : ''}`}>
                  →
                </span>
              </div>
              {expandedSections.includes(6) && (
                <div className="px-5 pb-5">
                  <p className="text-gray-500 italic">Coming soon</p>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-8">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                <span className="text-2xl">⚡</span>
                How to Implement
              </h3>

              <div className="mb-8">
                <h4 className="font-bold text-black mb-3">Define Boundaries</h4>
                <ul className="space-y-2">
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Scope: "You only handle X, not Y"</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Escalation: When to punt to legal/finance/human</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Failure points: Won't ask for prioritization (but should)</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Time limits: "Spend max 30 minutes on this"</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Authority limits: What can it decide vs what needs approval</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-black mb-3">Design the Handoffs</h4>
                <ul className="space-y-2">
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">Who hands off to whom?</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">What triggers a handoff?</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">What information gets passed along?</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">How do specialists communicate what they couldn't do?</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">What's the protocol when an agent gets stuck?</span>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-black mr-2">•</span>
                    <span className="text-gray-700">How do you prevent infinite loops between agents?</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center my-16">
            <Button
              onClick={() => navigate('/projects')}
              className="bg-white text-black border-2 border-black px-10 py-4 text-lg font-bold rounded-lg hover:bg-black hover:text-white transition-colors"
            >
              Try it out
            </Button>
          </div>

          {/* Closing Section */}
          <div className="text-center p-10 bg-black text-white rounded-xl">
            <h2 className="text-4xl font-bold mb-4">Here's the thing.</h2>
            <p className="text-lg max-w-2xl mx-auto leading-relaxed mb-8">
              Building prompts that work is an art form (it's funny because I just spent this entire page convincing you all art can be broken into steps). 
              Try something. Fail. Iterate. Give yourself the freedom to be in the loop on the interesting parts. Get back to the parts of your job you like.
            </p>
            <Button
              onClick={() => navigate('/projects')}
              className="bg-white text-black border-2 border-white px-10 py-4 text-lg font-bold rounded-lg hover:bg-gray-100 transition-colors"
            >
              Build a Prompt
            </Button>
          </div>

          {/* Footer Note */}
          <div className="text-center text-gray-600 leading-relaxed">
            <p>
              We didn't make this up. Turns out the engineers at Anthropic, OpenAI, and the builders in Lenny's Newsletter community came to the same conclusions. 
              Sometimes the best ideas are just obvious once you've failed enough times.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}