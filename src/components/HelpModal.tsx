import React from 'react';
import { X, Navigation, Zap, Flag, Trophy, ShieldAlert, Sparkles } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="bg-[#121624] border border-[#2b354b] rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl text-zinc-300">
        <div className="flex items-center justify-between border-b border-[#222b3e] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-black text-white text-sm">
              VH
            </div>
            <div>
              <h2 className="text-white font-extrabold text-lg">Velocity Horizon Guide</h2>
              <p className="text-xs text-zinc-400">Open World 3D Driving Simulator</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#1b2233] hover:bg-[#263148] text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Keyboard Controls */}
        <div className="mb-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2.5 flex items-center gap-1.5">
            <Navigation className="w-4 h-4" /> Driving Controls
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#161c2d] p-2.5 rounded-xl border border-[#232d43] flex items-center justify-between">
              <span className="text-zinc-400">Accelerate / Gas</span>
              <kbd className="bg-[#242f47] text-white px-2 py-0.5 rounded font-mono font-bold">W / ↑</kbd>
            </div>
            <div className="bg-[#161c2d] p-2.5 rounded-xl border border-[#232d43] flex items-center justify-between">
              <span className="text-zinc-400">Brake / Reverse</span>
              <kbd className="bg-[#242f47] text-white px-2 py-0.5 rounded font-mono font-bold">S / ↓</kbd>
            </div>
            <div className="bg-[#161c2d] p-2.5 rounded-xl border border-[#232d43] flex items-center justify-between">
              <span className="text-zinc-400">Steer Left / Right</span>
              <kbd className="bg-[#242f47] text-white px-2 py-0.5 rounded font-mono font-bold">A / D / ← →</kbd>
            </div>
            <div className="bg-[#161c2d] p-2.5 rounded-xl border border-[#232d43] flex items-center justify-between">
              <span className="text-zinc-400">Handbrake / Drift</span>
              <kbd className="bg-[#242f47] text-white px-2 py-0.5 rounded font-mono font-bold">SPACE</kbd>
            </div>
            <div className="bg-[#161c2d] p-2.5 rounded-xl border border-[#232d43] flex items-center justify-between">
              <span className="text-zinc-400">Nitro Boost</span>
              <kbd className="bg-[#242f47] text-white px-2 py-0.5 rounded font-mono font-bold">SHIFT</kbd>
            </div>
            <div className="bg-[#161c2d] p-2.5 rounded-xl border border-[#232d43] flex items-center justify-between">
              <span className="text-zinc-400">Reset Car (Flip)</span>
              <kbd className="bg-[#242f47] text-white px-2 py-0.5 rounded font-mono font-bold">R</kbd>
            </div>
            <div className="bg-[#161c2d] p-2.5 rounded-xl border border-[#232d43] flex items-center justify-between">
              <span className="text-zinc-400">Switch Camera</span>
              <kbd className="bg-[#242f47] text-white px-2 py-0.5 rounded font-mono font-bold">C</kbd>
            </div>
            <div className="bg-[#161c2d] p-2.5 rounded-xl border border-[#232d43] flex items-center justify-between">
              <span className="text-zinc-400">Toggle Controls</span>
              <kbd className="bg-[#242f47] text-white px-2 py-0.5 rounded font-mono font-bold">H</kbd>
            </div>
          </div>
        </div>

        {/* Open World Features */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> Open World Activities
          </h3>

          <div className="bg-[#161c2d] p-3 rounded-xl border border-[#232d43] flex items-start gap-3">
            <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-white font-bold text-xs">Speed Traps & Radar Gantries</h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Fly past overhead radar cameras on the Runway, Coastal Highway, and Downtown Boulevard to set high-speed records!
              </p>
            </div>
          </div>

          <div className="bg-[#161c2d] p-3 rounded-xl border border-[#232d43] flex items-start gap-3">
            <Trophy className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-white font-bold text-xs">Stunt Loops & Mega Canyon Ramps</h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Hit the 360-degree vertical loop and launch across canyons in Stunt Valley to earn air-time bonus points!
              </p>
            </div>
          </div>

          <div className="bg-[#161c2d] p-3 rounded-xl border border-[#232d43] flex items-start gap-3">
            <Flag className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-white font-bold text-xs">Time Trial Challenges</h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Select missions in the bottom dock to race through glowing checkpoint gates and beat course records.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
        >
          Got It, Let's Drive!
        </button>
      </div>
    </div>
  );
};
