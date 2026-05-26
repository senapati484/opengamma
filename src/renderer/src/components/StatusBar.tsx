import React, { useEffect, useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { useElectron } from '../lib/useElectron'

export const StatusBar: React.FC = () => {
  const { settings } = useAppContext()
  const api = useElectron()
  const [appVersion, setAppVersion] = useState<string>('1.0.1')

  useEffect(() => {
    const fetchVersion = async (): Promise<void> => {
      try {
        const info = await api.getAppInfo()
        setAppVersion(info.version)
      } catch {
        // Safe default fallback of '1.0.1' remains
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
            className={`w-1.5 h-1.5 rounded-full ${agentText === 'None' && isLocal ? 'bg-red-500' : 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]'}`}
          />
          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest leading-none mt-0.5">
            {modeText}
          </span>
          <span className="text-neutral-700 font-black text-[9px] uppercase tracking-tighter">
            /
          </span>
          <span className="text-[9px] font-black text-[#e8ff57] uppercase tracking-widest leading-none mt-0.5">
            {agentText}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 h-full">
        <div className="h-3 w-px bg-white/5" />
        <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-[0.2em] leading-none mt-0.5">
          Open Gamma v{appVersion}
        </span>
      </div>
    </div>
  )
}
