import React, { useEffect, useRef } from 'react';
import { PhysicsState } from '../game/carPhysics';
import { GameMission } from '../types/game';

interface MinimapProps {
  physics: PhysicsState | null;
  activeMission: GameMission | null;
  missionCheckpointIdx: number;
}

export const Minimap: React.FC<MinimapProps> = ({
  physics,
  activeMission,
  missionCheckpointIdx,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 150;
    canvas.width = size;
    canvas.height = size;

    // Background terrain
    ctx.fillStyle = '#1c2826';
    ctx.fillRect(0, 0, size, size);

    // Coordinate conversion: World (-380 to +380) to Minimap (0 to 150)
    const toMapX = (worldX: number) => ((worldX + 380) / 760) * size;
    const toMapY = (worldZ: number) => ((worldZ + 380) / 760) * size;

    // Ocean water zone on East
    ctx.fillStyle = '#0a3641';
    ctx.fillRect(toMapX(220), 0, size - toMapX(220), size);

    // Roads (Asphalt Gray lines)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;

    // Coastal Highway (North-South)
    ctx.beginPath();
    ctx.moveTo(toMapX(150), toMapY(-350));
    ctx.lineTo(toMapX(150), toMapY(350));
    ctx.stroke();

    // Grand Cross Arterial (East-West)
    ctx.beginPath();
    ctx.moveTo(toMapX(-350), toMapY(0));
    ctx.lineTo(toMapX(350), toMapY(0));
    ctx.stroke();

    // Downtown Grid
    ctx.lineWidth = 2.5;
    [-280, -160, -40].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(toMapX(x), toMapY(-280));
      ctx.lineTo(toMapX(x), toMapY(-40));
      ctx.stroke();
    });
    [-280, -160, -40].forEach((z) => {
      ctx.beginPath();
      ctx.moveTo(toMapX(-280), toMapY(z));
      ctx.lineTo(toMapX(-40), toMapY(z));
      ctx.stroke();
    });

    // Airport Runway
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(toMapX(20), toMapY(-350));
    ctx.lineTo(toMapX(20), toMapY(80));
    ctx.stroke();

    // Stunt Loop & Canyon zone
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(toMapX(-200), toMapY(240), 10, 0, Math.PI * 2);
    ctx.stroke();

    // Speed traps markers
    ctx.fillStyle = '#f59e0b';
    [
      { x: 20, z: -50 },
      { x: 150, z: 0 },
      { x: -160, z: -160 },
    ].forEach((st) => {
      ctx.fillRect(toMapX(st.x) - 2, toMapY(st.z) - 2, 4, 4);
    });

    // Active Mission Checkpoint Target
    if (activeMission) {
      const cp = activeMission.checkpoints[missionCheckpointIdx];
      if (cp) {
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(toMapX(cp.x), toMapY(cp.z), 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Player Vehicle Icon & Heading Arrow
    if (physics) {
      const px = toMapX(physics.position.x);
      const py = toMapY(physics.position.z);
      const angle = physics.rotation.y;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle);

      // Player Triangle
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(0, 7);
      ctx.lineTo(-5, -6);
      ctx.lineTo(0, -3);
      ctx.lineTo(5, -6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();
    }
  }, [physics, activeMission, missionCheckpointIdx]);

  return (
    <div className="absolute top-20 left-4 pointer-events-auto bg-[#10141f] border border-[#273042] rounded-2xl p-2 shadow-xl">
      <div className="relative w-[150px] h-[150px] rounded-xl overflow-hidden border border-[#1e2638]">
        <canvas ref={canvasRef} className="w-full h-full" />
        <div className="absolute top-1 left-2 text-[9px] font-bold text-zinc-400 uppercase tracking-wider bg-black/60 px-1 rounded">
          GPS Radar
        </div>
      </div>
    </div>
  );
};
