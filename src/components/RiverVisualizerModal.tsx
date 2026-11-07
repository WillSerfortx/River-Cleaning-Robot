import React, { useRef, useEffect, useState } from 'react';
import { X, Play, Square, Compass, RefreshCw, Plus, Sparkles, Navigation } from 'lucide-react';
import { RobotState } from '../types/robot';
import { esp32 } from '../services/esp32Service';
import { soundFx } from '../utils/audio';

interface RiverVisualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  robotState: RobotState;
}

interface RiverTrash {
  id: number;
  x: number;
  y: number;
  type: 'bottle' | 'can' | 'bag';
  collected: boolean;
}

interface RockObstacle {
  x: number;
  y: number;
  radius: number;
}

export const RiverVisualizerModal: React.FC<RiverVisualizerModalProps> = ({
  isOpen,
  onClose,
  robotState,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [botPos, setBotPos] = useState({ x: 200, y: 340, angle: -Math.PI / 2 });
  const [trashItems, setTrashItems] = useState<RiverTrash[]>([
    { id: 1, x: 120, y: 150, type: 'bottle', collected: false },
    { id: 2, x: 260, y: 180, type: 'can', collected: false },
    { id: 3, x: 180, y: 90, type: 'bag', collected: false },
    { id: 4, x: 310, y: 120, type: 'bottle', collected: false },
    { id: 5, x: 90, y: 220, type: 'can', collected: false },
  ]);

  const obstacles: RockObstacle[] = [
    { x: 70, y: 110, radius: 24 },
    { x: 330, y: 230, radius: 26 },
  ];

  // Spawn more debris
  const spawnDebris = () => {
    soundFx.playClick(800);
    const newItems: RiverTrash[] = [
      {
        id: Date.now() + Math.random(),
        x: 60 + Math.random() * 280,
        y: 40 + Math.random() * 120,
        type: Math.random() < 0.5 ? 'bottle' : 'can',
        collected: false,
      },
    ];
    setTrashItems((prev) => [...prev, ...newItems]);
  };

  useEffect(() => {
    if (!isOpen) return;
    let animId: number;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let currentAngle = botPos.angle;
    let currentX = botPos.x;
    let currentY = botPos.y;

    const render = () => {
      // 1. Move robot according to current movement
      const move = esp32.getState().movement;
      const speedPct = esp32.getState().speed / 100;
      const speed = 1.4 * speedPct;

      if (move === 'FORWARD') {
        currentX += Math.cos(currentAngle) * speed;
        currentY += Math.sin(currentAngle) * speed;
      } else if (move === 'BACKWARD') {
        currentX -= Math.cos(currentAngle) * (speed * 0.7);
        currentY -= Math.sin(currentAngle) * (speed * 0.7);
      } else if (move === 'LEFT') {
        currentAngle -= 0.04;
      } else if (move === 'RIGHT') {
        currentAngle += 0.04;
      }

      // Keep bot in bounds
      currentX = Math.max(50, Math.min(350, currentX));
      currentY = Math.max(50, Math.min(420, currentY));

      setBotPos({ x: currentX, y: currentY, angle: currentAngle });

      // 2. Clear River Canvas
      ctx.fillStyle = '#061325'; // Deep river water
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // River Water Current flow lines
      ctx.strokeStyle = '#0e2b4d';
      ctx.lineWidth = 1;
      const time = Date.now() / 800;
      for (let i = 20; i < canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.bezierCurveTo(
          i + Math.sin(time + i) * 15,
          150,
          i - Math.sin(time + i) * 15,
          300,
          i,
          canvas.height
        );
        ctx.stroke();
      }

      // River Banks (Left and Right shorelines)
      ctx.fillStyle = '#071f18';
      ctx.fillRect(0, 0, 30, canvas.height);
      ctx.fillRect(canvas.width - 30, 0, 30, canvas.height);
      ctx.strokeStyle = '#0f4838';
      ctx.strokeRect(0, 0, 30, canvas.height);
      ctx.strokeRect(canvas.width - 30, 0, 30, canvas.height);

      // Rocks / Obstacles
      obstacles.forEach((rock) => {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(rock.x, rock.y, rock.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(rock.x - 5, rock.y - 5, rock.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Render Floating Debris
      trashItems.forEach((item) => {
        if (item.collected) return;

        // Check if collected by front scoop of boat
        const distToBot = Math.hypot(item.x - currentX, item.y - currentY);
        const isConveyorOn = esp32.getState().conveyor.status === 'RUNNING';

        if (distToBot < 28 && isConveyorOn) {
          item.collected = true;
          soundFx.playClick(900, 0.08);
          soundFx.triggerHaptic(25);
        }

        ctx.save();
        ctx.translate(item.x, item.y);
        if (item.type === 'bottle') {
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(-4, -8, 8, 16);
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(-2, -11, 4, 3);
        } else if (item.type === 'can') {
          ctx.fillStyle = '#f87171';
          ctx.beginPath();
          ctx.arc(0, 0, 6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.arc(0, 0, 7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // 4. Render RiverBot
      ctx.save();
      ctx.translate(currentX, currentY);
      ctx.rotate(currentAngle + Math.PI / 2);

      // Ultrasonic Sonar Rays (Front, Left, Right)
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
      ctx.fillStyle = 'rgba(0, 229, 255, 0.06)';
      ctx.lineWidth = 1;

      // Front Sonar Cone
      ctx.beginPath();
      ctx.moveTo(0, -25);
      ctx.lineTo(-25, -95);
      ctx.lineTo(25, -95);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dual Pontoons (Catamaran hull)
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.5;

      // Left Pontoon
      ctx.beginPath();
      ctx.roundRect(-22, -26, 10, 52, 4);
      ctx.fill();
      ctx.stroke();

      // Right Pontoon
      ctx.beginPath();
      ctx.roundRect(12, -26, 10, 52, 4);
      ctx.fill();
      ctx.stroke();

      // Central Deck & Hopper
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#38bdf8';
      ctx.fillRect(-12, -18, 24, 36);

      // Conveyor Belt in center
      const isConveyorActive = esp32.getState().conveyor.status === 'RUNNING';
      ctx.fillStyle = isConveyorActive ? '#00e5ff' : '#475569';
      ctx.fillRect(-7, -24, 14, 20);

      // Animated conveyor belt ridges
      if (isConveyorActive) {
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.5;
        const beltOffset = (Date.now() / 40) % 6;
        for (let b = -22 + beltOffset; b < -6; b += 5) {
          ctx.beginPath();
          ctx.moveTo(-7, b);
          ctx.lineTo(7, b);
          ctx.stroke();
        }
      }

      // Propeller wakes
      if (move === 'FORWARD') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-17, 28);
        ctx.lineTo(-20, 42);
        ctx.moveTo(17, 28);
        ctx.lineTo(20, 42);
        ctx.stroke();
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isOpen, trashItems]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3">
      <div className="bg-[#070e1c] border border-cyan-500/40 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(0,229,255,0.25)] flex flex-col">
        {/* Modal Top Bar */}
        <div className="p-4 bg-[#0a1526] border-b border-[#142338] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-extrabold text-white tracking-wide">
                River Overhead Radar Visualizer
              </h3>
              <p className="text-[11px] text-slate-400">
                Live top-down simulation of RiverBot intake & sonar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#102035] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2D River Canvas */}
        <div className="relative flex items-center justify-center p-2 bg-[#040810]">
          <canvas
            ref={canvasRef}
            width={400}
            height={460}
            className="rounded-2xl border border-cyan-500/20 max-w-full"
          />

          {/* Quick Overhead Overlays */}
          <div className="absolute top-4 left-4 bg-[#070e1a]/80 backdrop-blur-sm border border-cyan-500/30 px-2.5 py-1 rounded-lg text-[10px] font-mono text-cyan-300">
            Current: {robotState.movement} · {robotState.mode}
          </div>

          <div className="absolute top-4 right-4 bg-[#070e1a]/80 backdrop-blur-sm border border-cyan-500/30 px-2.5 py-1 rounded-lg text-[10px] font-mono text-teal-300">
            Conveyor: {robotState.conveyor.status}
          </div>

          {/* Floating Action Button to spawn extra debris */}
          <button
            onClick={spawnDebris}
            className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono shadow-lg transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Spawn Trash</span>
          </button>
        </div>

        {/* Quick Instructions / Controls */}
        <div className="p-3 bg-[#0a1526] border-t border-[#142338] flex items-center justify-between text-xs font-mono text-slate-300">
          <span>Use Joystick on Control screen to steer boat</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-[#142640] text-cyan-300 font-semibold hover:bg-[#1a3356]"
          >
            Back to Controls
          </button>
        </div>
      </div>
    </div>
  );
};
