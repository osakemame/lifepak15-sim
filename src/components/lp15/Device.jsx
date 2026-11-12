import React from 'react';
import './lp15.css';
import Screen from './Screen.jsx';
import { useFitScale } from '../../hooks/useFitScale.js';
import {
  BatteryChargeIcon,
  BoltIcon,
  HomeIcon,
  PlugIcon,
  SunIcon,
  WrenchIcon,
} from './icons.jsx';

export const DEVICE_W = 1340;
export const DEVICE_H = 760;

// Bouton physique. Seuls les boutons reliés à une action (onPress) réagissent :
// les autres sont décoratifs, comme convenu (le stagiaire n'utilise que RCP, ANALYSE, CHOC et PNI).
function Btn({ label, style, className = '', led, ledOn, onPress, children }) {
  const active = typeof onPress === 'function';
  return (
    <div
      role={active ? 'button' : undefined}
      tabIndex={active ? 0 : undefined}
      aria-label={typeof label === 'string' ? label : undefined}
      className={`lp-btn ${className}${active ? ' active' : ''}`}
      style={style}
      onClick={active ? onPress : undefined}
      onKeyDown={active ? (e) => (e.key === 'Enter' || e.key === ' ') && onPress() : undefined}
    >
      {led && <span className={`led${ledOn ? ' on' : ''}`} />}
      <span className="lbl">{children ?? label}</span>
    </div>
  );
}

const Num = ({ n, x, y }) => (
  <div className="lp-num" style={{ left: x, top: y }}>{n}</div>
);

/**
 * Face avant du LIFEPAK 15 (mode DSA).
 *  - view    : ce que l'écran affiche (engine/viewModel.js)
 *  - actions : { analyse, rcp, pni, shock } (les 4 boutons actifs)
 */
export default function Device({ view, actions, reserveTop = 0 }) {
  const scale = useFitScale(DEVICE_W, DEVICE_H, { reserveTop });

  return (
    <div className="lp-fit" style={{ width: DEVICE_W * scale, height: DEVICE_H * scale }}>
      <div className="lp-device" style={{ transform: `scale(${scale})` }}>
        {/* Plaque du nom */}
        <div className="lp-plate">
          <span className="big">LIFEPAK 15</span>
          <span className="small">MONITEUR/DEFIBRILLATEUR</span>
        </div>
        <i className="lp-screw" style={{ left: 200, top: 36 }} />
        <i className="lp-screw" style={{ left: 968, top: 36 }} />

        {/* Écran */}
        <div className="lp-bezel">
          <Screen view={view} onRcpPick={actions.rcpChoose} onBeat={actions.onBeat} />
        </div>
        <i className="lp-screw" style={{ left: 200, top: 712 }} />
        <i className="lp-screw" style={{ left: 968, top: 712 }} />

        {/* Boutons de gauche (décoratifs) */}
        <div className="lp-left">
          <Btn label="12 DERIV" style={{ left: 12, top: 14, width: 126, height: 40 }} />
          <Btn label="TRANSM" style={{ left: 12, top: 66, width: 126, height: 40 }} />
          <Btn label="RESUME D'ECG" style={{ left: 12, top: 118, width: 126, height: 52, lineHeight: 1.05 }} className="two-lines" />
          <Btn label="IMPRIMER" style={{ left: 12, top: 182, width: 126, height: 40 }} />
        </div>
        <div className="lp-grille" />

        {/* Étiquette de dose */}
        <div className="lp-sticker">
          Dose adulte FV<br />recommandée : 200-300-360J
        </div>

        {/* Panneau de droite */}
        <div className="lp-right-frame" />
        <div className="lp-right">
          {/* Voyants secteur / batterie / service */}
          <div className="lp-status-leds">
            <div><i /><PlugIcon /></div>
            <div><i /><BatteryChargeIcon /></div>
            <div><i /><WrenchIcon /></div>
          </div>
          <Num n="1" x={139} y={22} />
          <Btn label="MARCHE" className="green" led ledOn={view.leds.power} onPress={actions.power} style={{ left: 176, top: 14, width: 124, height: 46 }} />

          <Btn label="RCP" led ledOn={view.leds.rcp} onPress={actions.rcp} style={{ left: 14, top: 96, width: 120, height: 42 }} />
          <Num n="2" x={139} y={94} />
          <Btn label="ANALYSE" className="analyse" led ledOn={view.leds.analyse} onPress={actions.analyse} style={{ left: 14, top: 150, width: 120, height: 42 }} />
          <Num n="3" x={139} y={148} />
          <Btn label="DERIV" className="small" style={{ left: 14, top: 206, width: 58, height: 36 }} />
          <Btn label="GAIN" className="small" style={{ left: 76, top: 206, width: 58, height: 36 }} />
          <Btn label="SYNC" led style={{ left: 14, top: 256, width: 120, height: 40 }} />

          {/* Zone grise : énergie, charge, choc */}
          <div className="lp-zone grey" style={{ left: 160, top: 82, width: 146, height: 222 }} />
          <Btn label="▼ SELECT ENERG. ▲" className="select" style={{ left: 168, top: 92, width: 130, height: 46 }}>
            <span className="arrow">▼</span>
            <span className="two">SELECT<br />ENERG.</span>
            <span className="arrow">▲</span>
          </Btn>
          <Btn label="CHARGER" className="yellow" style={{ left: 168, top: 150, width: 130, height: 38 }} />
          <i className="lp-shock-led" />
          <div
            role="button"
            tabIndex={0}
            aria-label="CHOC"
            className={`lp-shock${view.shockReady ? ' ready' : ''}`}
            onClick={actions.shock}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && actions.shock()}
          >
            <BoltIcon color="#fff" size={34} />
          </div>

          <Btn label="PNI" led ledOn={view.leds.pni} onPress={actions.pni} style={{ left: 14, top: 332, width: 120, height: 40 }} />
          <Btn label="ALARMES" className="amber" led style={{ left: 14, top: 388, width: 120, height: 40 }} />
          <Btn label="OPTIONS" style={{ left: 14, top: 440, width: 120, height: 36 }} />
          <Btn label="EVENEMENT" style={{ left: 14, top: 488, width: 120, height: 36 }} />

          {/* Zone verte : stimulation (décorative) */}
          <div className="lp-zone green" style={{ left: 160, top: 318, width: 146, height: 208 }} />
          <Btn label="STIMUL" led style={{ left: 168, top: 328, width: 130, height: 38 }} />
          <Btn label="▼ FREQ ▲" style={{ left: 168, top: 376, width: 130, height: 38 }}>
            <span className="arrow">▼</span><span>FREQ</span><span className="arrow">▲</span>
          </Btn>
          <Btn label="▼ COURANT ▲" style={{ left: 168, top: 424, width: 130, height: 38 }}>
            <span className="arrow">▼</span><span>COURANT</span><span className="arrow">▲</span>
          </Btn>
          <Btn label="PAUSE" style={{ left: 168, top: 472, width: 130, height: 38 }} />

          {/* Écran principal, luminosité, molette (décoratifs) */}
          <div className="lp-round home"><HomeIcon /></div>
          <div className="lp-home-label">ÉCRAN<br />PRINC.</div>
          <div className="lp-round sun"><SunIcon /></div>
          <div className="lp-nav-label">NAV. RAPIDE</div>
          <div className="lp-dial"><div className="knob" /></div>
        </div>
      </div>
    </div>
  );
}
