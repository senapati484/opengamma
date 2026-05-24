import React, { useState, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import { DesignSystemPicker } from './DesignSystemPicker'
import type { AppSettings, DetectedCLI } from '../types'
// @ts-ignore - package.json is outside the web tsconfig rootDir, but Vite bundles it successfully at runtime
import packageJson from '../../../../package.json'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const { settings, setSettings, setSelectedDesignSystem } = useAppContext()

  const [activeTab, setActiveTab] = useState<'execution' | 'design' | 'export' | 'about'>(
    'execution'
  )

  // Execution & Model state
  const [executionMode, setExecutionMode] = useState<'local-cli' | 'anthropic-api' | 'gemini-api' | 'openai-api' | 'deepseek-api' | 'groq-api'>('local-cli')
  const [selectedApiProvider, setSelectedApiProvider] = useState<'anthropic' | 'gemini' | 'openai' | 'deepseek' | 'groq'>('anthropic')
  const [selectedCliId, setSelectedCliId] = useState('')
  const [tempApiKey, setTempApiKey] = useState('')
  const [tempGeminiApiKey, setTempGeminiApiKey] = useState('')
  const [tempOpenaiApiKey, setTempOpenaiApiKey] = useState('')
  const [tempDeepseekApiKey, setTempDeepseekApiKey] = useState('')
  const [tempGroqApiKey, setTempGroqApiKey] = useState('')
  const [detectedCLIs, setDetectedCLIs] = useState<DetectedCLI[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [testStatus, setTestStatus] = useState<{ valid: boolean; error?: string } | null>(null)
  const [geminiTestStatus, setGeminiTestStatus] = useState<{ valid: boolean; error?: string } | null>(null)
  const [openaiTestStatus, setOpenaiTestStatus] = useState<{ valid: boolean; error?: string } | null>(null)
  const [deepseekTestStatus, setDeepseekTestStatus] = useState<{ valid: boolean; error?: string } | null>(null)
  const [groqTestStatus, setGroqTestStatus] = useState<{ valid: boolean; error?: string } | null>(null)
  const [isTestingKey, setIsTestingKey] = useState(false)
  const [isTestingGeminiKey, setIsTestingGeminiKey] = useState(false)
  const [isTestingOpenaiKey, setIsTestingOpenaiKey] = useState(false)
  const [isTestingDeepseekKey, setIsTestingDeepseekKey] = useState(false)
  const [isTestingGroqKey, setIsTestingGroqKey] = useState(false)

  // Design Systems state (Phase 2)
  // Handled by DesignSystemPicker

  // Export & Defaults state
  const [defaultSlideCount, setDefaultSlideCount] = useState(8)
  const [defaultNarrative, setDefaultNarrative] = useState('explainer')
  const [includeSpeakerNotes, setIncludeSpeakerNotes] = useState(true)
  const [addReferralFooter, setAddReferralFooter] = useState(true)

  // About state
  const [appInfo, setAppInfo] = useState<{
    version: string
    platform: string
    arch: string
  } | null>(null)

  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        const loaded = await window.electronAPI.getSettings()
        setExecutionMode(loaded.executionMode)
        if (loaded.executionMode === 'gemini-api') {
          setSelectedApiProvider('gemini')
        } else if (loaded.executionMode === 'openai-api') {
          setSelectedApiProvider('openai')
        } else if (loaded.executionMode === 'deepseek-api') {
          setSelectedApiProvider('deepseek')
        } else if (loaded.executionMode === 'groq-api') {
          setSelectedApiProvider('groq')
        } else {
          setSelectedApiProvider('anthropic')
        }
        setSelectedCliId(loaded.selectedCliId)
        setTempApiKey(loaded.claudeApiKey || '')
        setTempGeminiApiKey(loaded.geminiApiKey || '')
        setTempOpenaiApiKey(loaded.openaiApiKey || '')
        setTempDeepseekApiKey(loaded.deepseekApiKey || '')
        setTempGroqApiKey(loaded.groqApiKey || '')
        setDefaultSlideCount(loaded.defaultSlideCount)
        setDefaultNarrative(loaded.defaultNarrative)
        setIncludeSpeakerNotes(loaded.includeSpeakerNotes ?? true)
        setAddReferralFooter(loaded.addReferralFooter ?? true)

        const clis = await window.electronAPI.scanCLIs()
        setDetectedCLIs(clis)

        // @ts-ignore - missing on interface but implemented in IPC for this fix
        if (window.electronAPI.getAppInfo) {
          // @ts-ignore
          const info = await window.electronAPI.getAppInfo()
          setAppInfo(info)
        }
      }
      loadData()
    }
  }, [isOpen])

  const handleSave = async () => {
    const updated: AppSettings = {
      ...settings!,
      executionMode,
      selectedCliId,
      claudeApiKey: tempApiKey,
      geminiApiKey: tempGeminiApiKey,
      openaiApiKey: tempOpenaiApiKey,
      deepseekApiKey: tempDeepseekApiKey,
      groqApiKey: tempGroqApiKey,
      defaultSlideCount,
      defaultNarrative,
      includeSpeakerNotes,
      addReferralFooter
    }
    await window.electronAPI.saveSettings(updated)
    setSettings(updated)
    onClose()
  }

  const handleRescan = async () => {
    setIsScanning(true)
    const clis = await window.electronAPI.rescanCLIs()
    setDetectedCLIs(clis)
    setIsScanning(false)
  }

  const handleTestKey = async () => {
    setIsTestingKey(true)
    setTestStatus(null)
    try {
      // @ts-ignore
      const result = await window.electronAPI.testApiKey(tempApiKey)
      setTestStatus(result)
    } catch (err: any) {
      setTestStatus({ valid: false, error: err.message })
    } finally {
      setIsTestingKey(false)
    }
  }

  const handleTestGeminiKey = async () => {
    setIsTestingGeminiKey(true)
    setGeminiTestStatus(null)
    try {
      const result = await window.electronAPI.testGeminiApiKey(tempGeminiApiKey)
      setGeminiTestStatus(result)
    } catch (err: any) {
      setGeminiTestStatus({ valid: false, error: err.message })
    } finally {
      setIsTestingGeminiKey(false)
    }
  }

  const handleTestOpenaiKey = async () => {
    setIsTestingOpenaiKey(true)
    setOpenaiTestStatus(null)
    try {
      const result = await window.electronAPI.testOpenaiApiKey(tempOpenaiApiKey)
      setOpenaiTestStatus(result)
    } catch (err: any) {
      setOpenaiTestStatus({ valid: false, error: err.message })
    } finally {
      setIsTestingOpenaiKey(false)
    }
  }

  const handleTestDeepseekKey = async () => {
    setIsTestingDeepseekKey(true)
    setDeepseekTestStatus(null)
    try {
      const result = await window.electronAPI.testDeepseekApiKey(tempDeepseekApiKey)
      setDeepseekTestStatus(result)
    } catch (err: any) {
      setDeepseekTestStatus({ valid: false, error: err.message })
    } finally {
      setIsTestingDeepseekKey(false)
    }
  }

  const handleTestGroqKey = async () => {
    setIsTestingGroqKey(true)
    setGroqTestStatus(null)
    try {
      const result = await window.electronAPI.testGroqApiKey(tempGroqApiKey)
      setGroqTestStatus(result)
    } catch (err: any) {
      setGroqTestStatus({ valid: false, error: err.message })
    } finally {
      setIsTestingGroqKey(false)
    }
  }

  if (!isOpen) return null

  const installedCount = detectedCLIs.filter((c) => c.installed).length

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl h-full max-h-[600px] bg-[#0d0d0d] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-bounce">
        {/* Main Body */}
        <div className="flex-1 flex min-h-0">
          {/* Left Navigation */}
          <div className="w-[220px] bg-[#141414] border-r border-white/5 p-4 flex flex-col gap-1">
            <div className="px-3 py-2 mb-2">
              <div className="text-[10px] font-bold text-[#e8ff57] uppercase tracking-widest opacity-80">
                Settings
              </div>
            </div>

            <button
              onClick={() => setActiveTab('execution')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'execution' ? 'bg-white/5 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              <span className="text-lg">⚙</span> Execution & Model
            </button>

            <button
              onClick={() => setActiveTab('design')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'design' ? 'bg-white/5 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              <span className="text-lg">🎨</span> Design Systems
            </button>

            <button
              onClick={() => setActiveTab('export')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'export' ? 'bg-white/5 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              <span className="text-lg">⬇</span> Export & Defaults
            </button>

            <button
              onClick={() => setActiveTab('about')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'about' ? 'bg-white/5 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              <span className="text-lg">ℹ</span> About
            </button>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 flex flex-col min-h-0 bg-[#0d0d0d] overflow-y-auto custom-scrollbar p-8">
            {activeTab === 'execution' && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Execution & Model</h2>
                  <p className="text-sm text-neutral-500">
                    Choose how slides are generated: via local agents or cloud API.
                  </p>
                </div>

                 <div className="grid grid-cols-2 gap-4">
                  <div
                    onClick={() => setExecutionMode('local-cli')}
                    className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${executionMode === 'local-cli' ? 'border-[#e8ff57]/40 bg-[#e8ff57]/5' : 'border-white/5 bg-white/5 hover:border-white/10'}`}
                  >
                    <div className="font-bold text-white mb-1 text-sm sm:text-base">Local CLI</div>
                    <div className="text-[10px] sm:text-xs text-neutral-500">
                      {installedCount} installed agents
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      if (selectedApiProvider === 'gemini') setExecutionMode('gemini-api')
                      else if (selectedApiProvider === 'openai') setExecutionMode('openai-api')
                      else if (selectedApiProvider === 'deepseek') setExecutionMode('deepseek-api')
                      else if (selectedApiProvider === 'groq') setExecutionMode('groq-api')
                      else setExecutionMode('anthropic-api')
                    }}
                    className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${executionMode !== 'local-cli' ? 'border-[#e8ff57]/40 bg-[#e8ff57]/5' : 'border-white/5 bg-white/5 hover:border-white/10'}`}
                  >
                    <div className="font-bold text-white mb-1 text-sm sm:text-base">External API</div>
                    <div className="text-[10px] sm:text-xs text-neutral-500">Claude, Gemini, OpenAI, DeepSeek, Groq</div>
                  </div>
                </div>

                {executionMode === 'local-cli' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">
                        Detected Agents
                      </h3>
                      <button
                        onClick={handleRescan}
                        disabled={isScanning}
                        className="text-xs font-bold text-[#e8ff57] hover:underline disabled:opacity-50"
                      >
                        {isScanning ? 'Scanning...' : 'Rescan PATH'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {detectedCLIs.map((cli) => (
                        <div
                          key={cli.id}
                          onClick={() => cli.installed && setSelectedCliId(cli.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${!cli.installed ? 'opacity-40 grayscale' : 'cursor-pointer'} ${selectedCliId === cli.id ? 'border-[#e8ff57]/40 bg-[#e8ff57]/5' : 'border-white/5 bg-white/5 hover:border-white/10'}`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${cli.installed ? 'bg-green-500' : 'bg-neutral-700'}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                              {cli.name}
                            </div>
                            {cli.version && (
                              <div className="text-[10px] text-neutral-500">{cli.version}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {executionMode !== 'local-cli' && (
                  <div className="space-y-6">
                    {/* API Provider Selector */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                        Select API Provider
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedApiProvider('anthropic')
                            setExecutionMode('anthropic-api')
                          }}
                          className={`py-2 px-3 rounded-xl border font-bold text-xs transition-all cursor-pointer ${selectedApiProvider === 'anthropic' ? 'border-[#e8ff57]/40 bg-[#e8ff57]/10 text-[#e8ff57]' : 'border-white/5 bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                        >
                          Anthropic API
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedApiProvider('gemini')
                            setExecutionMode('gemini-api')
                          }}
                          className={`py-2 px-3 rounded-xl border font-bold text-xs transition-all cursor-pointer ${selectedApiProvider === 'gemini' ? 'border-[#e8ff57]/40 bg-[#e8ff57]/10 text-[#e8ff57]' : 'border-white/5 bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                        >
                          Gemini API
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedApiProvider('openai')
                            setExecutionMode('openai-api')
                          }}
                          className={`py-2 px-3 rounded-xl border font-bold text-xs transition-all cursor-pointer ${selectedApiProvider === 'openai' ? 'border-[#e8ff57]/40 bg-[#e8ff57]/10 text-[#e8ff57]' : 'border-white/5 bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                        >
                          OpenAI API
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedApiProvider('deepseek')
                            setExecutionMode('deepseek-api')
                          }}
                          className={`py-2 px-3 rounded-xl border font-bold text-xs transition-all cursor-pointer ${selectedApiProvider === 'deepseek' ? 'border-[#e8ff57]/40 bg-[#e8ff57]/10 text-[#e8ff57]' : 'border-white/5 bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                        >
                          DeepSeek API
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedApiProvider('groq')
                            setExecutionMode('groq-api')
                          }}
                          className={`py-2 px-3 rounded-xl border font-bold text-xs transition-all cursor-pointer ${selectedApiProvider === 'groq' ? 'border-[#e8ff57]/40 bg-[#e8ff57]/10 text-[#e8ff57]' : 'border-white/5 bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                        >
                          Groq API
                        </button>
                      </div>
                    </div>

                    {selectedApiProvider === 'anthropic' && (
                      <div className="space-y-4 pt-4 border-t border-white/5">
                        <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">
                          Anthropic Settings
                        </h3>
                        <div className="space-y-2">
                          <label className="text-xs text-neutral-500">API Key</label>
                          <div className="flex gap-2">
                            <input
                              type="password"
                              value={tempApiKey}
                              onChange={(e) => setTempApiKey(e.target.value)}
                              placeholder="sk-ant-..."
                              className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#e8ff57]/50"
                            />
                            <button
                              type="button"
                              onClick={handleTestKey}
                              disabled={isTestingKey || !tempApiKey}
                              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                            >
                              {isTestingKey ? 'Testing...' : 'Test'}
                            </button>
                          </div>
                          {testStatus && (
                            <div
                              className={`text-xs flex items-center gap-2 ${testStatus.valid ? 'text-green-500' : 'text-red-500'}`}
                            >
                              {testStatus.valid
                                ? '✓ Connection successful'
                                : `✕ ${testStatus.error || 'Invalid key'}`}
                            </div>
                          )}
                          <a
                            href="https://console.anthropic.com"
                            target="_blank"
                            rel="noreferrer"
                            className="block text-[11px] text-[#e8ff57] hover:underline opacity-80"
                          >
                            Get your key at console.anthropic.com
                          </a>
                        </div>
                      </div>
                    )}

                    {selectedApiProvider === 'gemini' && (
                      <div className="space-y-4 pt-4 border-t border-white/5">
                        <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">
                          Gemini Settings
                        </h3>
                        <div className="space-y-2">
                          <label className="text-xs text-neutral-500">API Key</label>
                          <div className="flex gap-2">
                            <input
                              type="password"
                              value={tempGeminiApiKey}
                              onChange={(e) => setTempGeminiApiKey(e.target.value)}
                              placeholder="AIzaSy..."
                              className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#e8ff57]/50"
                            />
                            <button
                              type="button"
                              onClick={handleTestGeminiKey}
                              disabled={isTestingGeminiKey || !tempGeminiApiKey}
                              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                            >
                              {isTestingGeminiKey ? 'Testing...' : 'Test'}
                            </button>
                          </div>
                          {geminiTestStatus && (
                            <div
                              className={`text-xs flex items-center gap-2 ${geminiTestStatus.valid ? 'text-green-500' : 'text-red-500'}`}
                            >
                              {geminiTestStatus.valid
                                ? '✓ Connection successful'
                                : `✕ ${geminiTestStatus.error || 'Invalid key'}`}
                            </div>
                          )}
                          <a
                            href="https://aistudio.google.com"
                            target="_blank"
                            rel="noreferrer"
                            className="block text-[11px] text-[#e8ff57] hover:underline opacity-80"
                          >
                            Get your key at aistudio.google.com
                          </a>
                        </div>
                      </div>
                    )}

                    {selectedApiProvider === 'openai' && (
                      <div className="space-y-4 pt-4 border-t border-white/5">
                        <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">
                          OpenAI Settings
                        </h3>
                        <div className="space-y-2">
                          <label className="text-xs text-neutral-500">API Key</label>
                          <div className="flex gap-2">
                            <input
                              type="password"
                              value={tempOpenaiApiKey}
                              onChange={(e) => setTempOpenaiApiKey(e.target.value)}
                              placeholder="sk-..."
                              className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#e8ff57]/50"
                            />
                            <button
                              type="button"
                              onClick={handleTestOpenaiKey}
                              disabled={isTestingOpenaiKey || !tempOpenaiApiKey}
                              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                            >
                              {isTestingOpenaiKey ? 'Testing...' : 'Test'}
                            </button>
                          </div>
                          {openaiTestStatus && (
                            <div
                              className={`text-xs flex items-center gap-2 ${openaiTestStatus.valid ? 'text-green-500' : 'text-red-500'}`}
                            >
                              {openaiTestStatus.valid
                                ? '✓ Connection successful'
                                : `✕ ${openaiTestStatus.error || 'Invalid key'}`}
                            </div>
                          )}
                          <a
                            href="https://platform.openai.com"
                            target="_blank"
                            rel="noreferrer"
                            className="block text-[11px] text-[#e8ff57] hover:underline opacity-80"
                          >
                            Get your key at platform.openai.com
                          </a>
                        </div>
                      </div>
                    )}

                    {selectedApiProvider === 'deepseek' && (
                      <div className="space-y-4 pt-4 border-t border-white/5">
                        <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">
                          DeepSeek Settings
                        </h3>
                        <div className="space-y-2">
                          <label className="text-xs text-neutral-500">API Key</label>
                          <div className="flex gap-2">
                            <input
                              type="password"
                              value={tempDeepseekApiKey}
                              onChange={(e) => setTempDeepseekApiKey(e.target.value)}
                              placeholder="sk-..."
                              className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#e8ff57]/50"
                            />
                            <button
                              type="button"
                              onClick={handleTestDeepseekKey}
                              disabled={isTestingDeepseekKey || !tempDeepseekApiKey}
                              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                            >
                              {isTestingDeepseekKey ? 'Testing...' : 'Test'}
                            </button>
                          </div>
                          {deepseekTestStatus && (
                            <div
                              className={`text-xs flex items-center gap-2 ${deepseekTestStatus.valid ? 'text-green-500' : 'text-red-500'}`}
                            >
                              {deepseekTestStatus.valid
                                ? '✓ Connection successful'
                                : `✕ ${deepseekTestStatus.error || 'Invalid key'}`}
                            </div>
                          )}
                          <a
                            href="https://platform.deepseek.com"
                            target="_blank"
                            rel="noreferrer"
                            className="block text-[11px] text-[#e8ff57] hover:underline opacity-80"
                          >
                            Get your key at platform.deepseek.com
                          </a>
                        </div>
                      </div>
                    )}

                    {selectedApiProvider === 'groq' && (
                      <div className="space-y-4 pt-4 border-t border-white/5">
                        <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">
                          Groq Settings
                        </h3>
                        <div className="space-y-2">
                          <label className="text-xs text-neutral-500">API Key</label>
                          <div className="flex gap-2">
                            <input
                              type="password"
                              value={tempGroqApiKey}
                              onChange={(e) => setTempGroqApiKey(e.target.value)}
                              placeholder="gsk_..."
                              className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#e8ff57]/50"
                            />
                            <button
                              type="button"
                              onClick={handleTestGroqKey}
                              disabled={isTestingGroqKey || !tempGroqApiKey}
                              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                            >
                              {isTestingGroqKey ? 'Testing...' : 'Test'}
                            </button>
                          </div>
                          {groqTestStatus && (
                            <div
                              className={`text-xs flex items-center gap-2 ${groqTestStatus.valid ? 'text-green-500' : 'text-red-500'}`}
                            >
                              {groqTestStatus.valid
                                ? '✓ Connection successful'
                                : `✕ ${groqTestStatus.error || 'Invalid key'}`}
                            </div>
                          )}
                          <a
                            href="https://console.groq.com"
                            target="_blank"
                            rel="noreferrer"
                            className="block text-[11px] text-[#e8ff57] hover:underline opacity-80"
                          >
                            Get your key at console.groq.com
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'design' && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Design Systems</h2>
                  <p className="text-sm text-neutral-500">
                    Choose the visual aesthetic for your generated slides.
                  </p>
                </div>
                <DesignSystemPicker
                  selectedId={settings?.defaultTheme}
                  onSelect={(s) => setSelectedDesignSystem(s)}
                  isCompact={false}
                />
              </div>
            )}

            {activeTab === 'export' && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Export & Defaults</h2>
                  <p className="text-sm text-neutral-500">
                    Set your default generation parameters and export preferences.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                        Default Slide Count
                      </label>
                      <input
                        type="number"
                        min={4}
                        max={20}
                        value={defaultSlideCount}
                        onChange={(e) => setDefaultSlideCount(parseInt(e.target.value))}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                        Default Style
                      </label>
                      <select
                        value={defaultNarrative}
                        onChange={(e) => setDefaultNarrative(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
                      >
                        <option value="explainer">Explainer</option>
                        <option value="pitch">VC Pitch</option>
                        <option value="report">Report</option>
                        <option value="academic">Academic</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5">
                      <span className="text-sm text-white">Include speaker notes</span>
                      <input
                        type="checkbox"
                        checked={includeSpeakerNotes}
                        onChange={(e) => setIncludeSpeakerNotes(e.target.checked)}
                        className="accent-[#e8ff57]"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5">
                      <span className="text-sm text-white">Add Open Gamma footer</span>
                      <input
                        type="checkbox"
                        checked={addReferralFooter}
                        onChange={(e) => setAddReferralFooter(e.target.checked)}
                        className="accent-[#e8ff57]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">About Open Gamma</h2>
                  <p className="text-sm text-neutral-500">Application information and updates.</p>
                </div>

                <div className="p-6 rounded-xl border border-white/5 bg-white/5 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-400">Version</span>
                    <span className="text-sm text-white font-mono">{packageJson.version}</span>
                  </div>
                  {appInfo && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-400">Platform</span>
                        <span className="text-sm text-white capitalize">{appInfo.platform}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-400">Architecture</span>
                        <span className="text-sm text-white">{appInfo.arch}</span>
                      </div>
                    </>
                  )}
                  <div className="pt-4 border-t border-white/5">
                    <button className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all">
                      Check for updates
                    </button>
                  </div>
                </div>

                <div className="text-center text-[11px] text-neutral-600">
                  Built with Electron, React & Framer Motion.
                  <br />
                  Copyright © 2026 Open Gamma Team.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex-none h-[72px] bg-[#141414] border-t border-white/5 px-8 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-neutral-400 hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[#e8ff57] text-black shadow-lg shadow-[#e8ff57]/10 active:scale-95 transition-all"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
