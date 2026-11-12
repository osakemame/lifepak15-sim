import React from 'react';
import TraceCanvas from './TraceCanvas.jsx';
import {
  AlarmOffIcon,
  BatteryIcon,
  BluetoothIcon,
  BoltIcon,
  EnergyIcon,
  TorsoDrawing,
} from './icons.jsx';

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

function RcpMenu({ items, onPick }) {
  return (
    <div className="lcd-menu">
      <div className="lcd-menu-title">Métronome RCP</div>
      {items.map((it) => (
        <button key={it.key} type="button" className={`lcd-menu-item${it.active || (it.cursor) ? ' active' : ''}`} onClick={() => onPick(it.key)}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

export default function Screen({ view, onRcpPick, onBeat }) {
  if (view.off || view.blank) return <div className="lcd lcd-blank" />;

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
        <TraceCanvas traces={view.traces} onBeat={onBeat} />
      </div>

      {view.modal && !view.rcpMenu && <Modal modal={view.modal} />}
      {view.rcpMenu && <RcpMenu items={view.rcpMenu} onPick={onRcpPick} />}

      <div className="lcd-band">
        {view.band.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </div>
  );
}
