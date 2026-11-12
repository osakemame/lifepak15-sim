import React from 'react';
import {
  AlarmOffIcon,
  BatteryIcon,
  BluetoothIcon,
  BoltIcon,
  EnergyIcon,
  TorsoDrawing,
} from './icons.jsx';

// ---------- Tracés (étape 2 : statiques ; l'animation arrive à l'étape 3) ----------

// Onde de pouls (pléthysmographie) : montée rapide, descente lente avec une petite encoche.
function plethPath(x0, x1, yBase, amp, period) {
  const foot = yBase + amp / 2;
  const peak = yBase - amp / 2;
  const h = foot - peak;
  const shape = [
    [0, 1],
    [0.13, 0],
    [0.22, 0.12],
    [0.3, 0.22],
    [0.36, 0.25],
    [0.42, 0.38],
    [1, 1],
  ];
  const pts = [];
  for (let x = x0; x < x1; x += period) {
    shape.forEach(([t, f]) => pts.push(`${(x + t * period).toFixed(1)},${(peak + f * h).toFixed(1)}`));
  }
  return pts.join(' ');
}

// Complexe QRS générique de remplacement (le vrai moteur de rythmes vient à l'étape 3)
function ecgPath(x0, x1, yBase) {
  const shape = [
    [0, 0], [30, 0], [36, -5], [42, 0], [52, 0], [56, 10], [62, -60], [68, 24], [74, 0],
    [88, 0], [100, -12], [112, 0], [130, 0],
  ];
  const period = 130;
  const pts = [];
  for (let x = x0; x < x1; x += period) {
    shape.forEach(([dx, dy]) => pts.push(`${x + dx},${yBase + dy}`));
  }
  return pts.join(' ');
}

const PLOT_W = 570;

function Traces({ traces }) {
  return (
    <svg className="lcd-traces" viewBox={`0 0 ${PLOT_W} 520`} width={PLOT_W} height="520" aria-hidden="true">
      {/* ECG */}
      {traces.ecgMode === 'signal' && (
        <polyline points={ecgPath(0, PLOT_W, 100)} fill="none" stroke="#7dff2e" strokeWidth="3" strokeLinejoin="round" />
      )}
      {traces.ecgMode === 'flat' && (
        <>
          <line x1="0" x2="360" y1="100" y2="100" stroke="#7dff2e" strokeWidth="3" />
          <line x1="385" x2={PLOT_W} y1="100" y2="100" stroke="#7dff2e" strokeWidth="3" />
        </>
      )}
      {traces.ecgMode === 'dashed' && (
        <line x1="0" x2={PLOT_W} y1="100" y2="100" stroke="#7dff2e" strokeWidth="3" strokeDasharray="40 16" />
      )}
      {/* SpO2 : deux tracés identiques, comme sur l'appareil */}
      {[270, 430].map((y) => (
        <g key={y}>
          {traces.spo2Signal ? (
            <polyline points={plethPath(0, PLOT_W, y, 90, 104)} fill="none" stroke="#2fb4ff" strokeWidth="3" strokeLinejoin="round" />
          ) : (
            <line x1="0" x2={PLOT_W} y1={y} y2={y} stroke="#2fb4ff" strokeWidth="3" strokeDasharray="40 16" />
          )}
          <text x={PLOT_W - 8} y={y - 50} textAnchor="end" className="lcd-trace-label blue">SpO2</text>
        </g>
      ))}
    </svg>
  );
}

// ---------- Blocs de constantes ----------

const Dashes = ({ small }) => (
  <span className={`dashes${small ? ' small' : ''}`}>
    <i />
    <i />
    <i />
  </span>
);

function HeartBlock({ heart }) {
  return (
    <>
      <div className={`lcd-hr-label hr-${heart.color}`}>{heart.label}</div>
      <div className="lcd-cross hr-cross"><AlarmOffIcon /></div>
      <div className={`lcd-hr-value hr-${heart.color}`}>
        {heart.value == null ? <Dashes /> : heart.value}
      </div>
    </>
  );
}

function Spo2Block({ spo2 }) {
  return (
    <>
      <div className="lcd-bar spo2-bar"><span>SpO2</span><span>%</span></div>
      <div className="lcd-cross spo2-cross"><AlarmOffIcon /></div>
      <div className="lcd-gauge"><div className="lcd-gauge-fill" style={{ height: spo2.connected ? '62%' : '0%' }} /></div>
      <div className="lcd-spo2-value">{spo2.value == null ? <Dashes small /> : spo2.value}</div>
    </>
  );
}

function PniBlock({ pni }) {
  return (
    <>
      <div className="lcd-bar pni-bar"><span>PNI</span><span>mmHg</span></div>
      <div className="lcd-cross pni-cross"><AlarmOffIcon /></div>
      {pni.mode === 'none' && (
        <>
          <div className="lcd-pni-sys"><Dashes small /></div>
          <div className="lcd-pni-dia"><Dashes small /></div>
        </>
      )}
      {pni.mode === 'measuring' && <div className="lcd-pni-sys">{pni.cuff}</div>}
      {pni.mode === 'done' && (
        <>
          <div className="lcd-pni-sys">{pni.sys}</div>
          <div className="lcd-pni-map">{pni.map}</div>
          <div className="lcd-pni-dia">{pni.dia}</div>
        </>
      )}
    </>
  );
}

// ---------- Fenêtre centrale ----------

function Modal({ modal }) {
  const white = ['charging', 'ready', 'delivered'].includes(modal.kind);
  return (
    <div className="lcd-modal">
      <div className="lcd-modal-title">{modal.title}</div>
      <div className={`lcd-modal-body ${white ? 'white' : 'grey'}`}>
        {modal.kind === 'dsa' && <div className="m-text">{modal.lines[0]}</div>}

        {modal.kind === 'pads' && (
          <>
            <div className="m-text small">{modal.lines[0]}</div>
            <div className="m-torso"><TorsoDrawing /></div>
          </>
        )}

        {modal.kind === 'rcp' && (
          <>
            <div className="m-text small">{modal.lines[0]}</div>
            <div className="m-countdown">{modal.countdown}</div>
          </>
        )}

        {modal.kind === 'charging' && (
          <>
            <div className="m-text small dark">{modal.lines[0]}</div>
            <div className="m-chargerow">
              <div className="m-bar">
                <div className="m-bar-fill" style={{ width: `${(modal.charge / modal.target) * 100}%` }} />
              </div>
              <div className="m-joules">{modal.charge}J</div>
            </div>
          </>
        )}

        {modal.kind === 'ready' && (
          <>
            <div className="m-text small dark">{modal.lines[0]}</div>
            <div className="m-text small dark">{modal.lines[1]}</div>
            <div className="m-bolt"><BoltIcon color="#fff" size={34} /></div>
          </>
        )}

        {modal.kind === 'delivered' && <div className="m-text small dark">{modal.lines[0]}</div>}
      </div>
    </div>
  );
}

// ---------- Écran complet ----------

export default function Screen({ view }) {
  if (view.blank) return <div className="lcd lcd-blank" />;

  return (
    <div className="lcd">
      <div className="lcd-topbar" />
      <div className="lcd-clock">{view.clock}</div>

      <div className="lcd-icons">
        <div className="ic ic-bt"><BluetoothIcon /></div>
        <div className="ic ic-bat"><span className="num">1</span><BatteryIcon /></div>
        <div className="ic ic-bat"><span className="num">2</span><BatteryIcon /></div>
        <div className="ic ic-energy"><EnergyIcon /><span>200J</span></div>
      </div>
      <div className="lcd-ecg-label">{view.traces.ecgLabel}</div>

      <HeartBlock heart={view.heart} />
      <Spo2Block spo2={view.spo2} />
      <PniBlock pni={view.pni} />

      <div className="lcd-plot">
        <Traces traces={view.traces} />
      </div>

      {view.modal && <Modal modal={view.modal} />}

      <div className="lcd-band">
        {view.band.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </div>
  );
}
