import React, { useEffect, useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { useElectron } from '../lib/useElectron'

export const StatusBar: React.FC = () => {
  const { settings } = useAppContext()
  const api = useElectron()
  const [appVersion, setAppVersion] = useState<string>('1.0.2')

  useEffect(() => {
    const fetchVersion = async (): Promise<void> => {
      try {
        const info = await api.getAppInfo()
        setAppVersion(info.version)
      } catch {
        // Safe default fallback of '1.0.2' remains
      }
    }
    fetchVersion()
  }, [api])

  if (!settings) return null

  const isLocal = settings.executionMode === 'local-cli'
  let modeText = 'Local CLI'
  let agentText = settings.selectedCliId || 'None'

  if (!isLocal) {
    if (settings.executionMode === 'anthropic-api') {
      modeText = 'Anthropic API'
      agentText = 'Claude'
    } else if (settings.executionMode === 'gemini-api') {
      modeText = 'Gemini API'
      agentText = 'Gemini'
    } else if (settings.executionMode === 'openai-api') {
      modeText = 'OpenAI API'
      agentText = 'GPT-4o'
    } else if (settings.executionMode === 'deepseek-api') {
      modeText = 'DeepSeek API'
      agentText = 'DeepSeek-V3'
    } else if (settings.executionMode === 'groq-api') {
      modeText = 'Groq API'
      agentText = 'Llama 3'
    }
  }

  return (
    <div className="h-[28px] bg-[#141414] border-t border-white/5 flex items-center px-4 justify-between select-none pointer-events-auto no-drag">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-1.5 h-1.5 rounded-full ${agentText === 'None' && isLocal ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]' : 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]'}`}
          />
          <span className="text-[10px] font-semibold text-neutral-300 uppercase tracking-wider leading-none">
            {modeText}
          </span>
          <span className="text-neutral-500 font-black text-[10px]">
            /
          </span>
          <span className="text-[10px] font-bold text-[#e8ff57] uppercase tracking-wider leading-none">
            {agentText}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 h-full">
        <span className="text-[10px] font-mono text-neutral-400">
          v{appVersion}
        </span>
      </div>
    </div>
  )
}
