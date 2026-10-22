'use client'
import { useState } from 'react'
import { golpesRecibidos, marcaPGA, puntosStableford } from '@/lib/golf'
import Icono from '../Icono'

const NOMBRE = { eagle: 'Eagle', birdie: 'Birdie', par: 'Par', bogey: 'Bogey', doble: 'Doble bogey o más' }

/** Elige hoyo y golpes: muestra golpes recibidos, neto y puntos Stableford con tu hándicap. */
export default function Simulador({ par, hcp, hj }: { par: number[]; hcp: number[]; hj: number }) {
  const [h, setH] = useState(0)
  const [golpes, setGolpes] = useState(par[0] + 1)
  const recibe = golpesRecibidos(hj, hcp[h])
  const neto = golpes - recibe
  const pts = puntosStableford(golpes, par[h], recibe)!
  const irA = (i: number) => { setH(i); setGolpes(par[i] + 1) }
  return (
    <div className="simulador">
      <div className="nav-hoyo">
        <button aria-label="Hoyo anterior" disabled={h === 0} onClick={() => irA(h - 1)}><Icono n="antes" /></button>
        <div><b>Hoyo {h + 1}</b><small>Par {par[h]} · HCP {hcp[h]}</small></div>
        <button aria-label="Hoyo siguiente" disabled={h === 17} onClick={() => irA(h + 1)}><Icono n="despues" /></button>
      </div>
      <div className="fila">
        <div className="quien">Si haces…<small>golpes reales</small></div>
        <div className="paso">
          <button aria-label="Restar golpe" disabled={golpes <= 1} onClick={() => setGolpes(golpes - 1)}>−</button>
          <output>{golpes}</output>
          <button aria-label="Sumar golpe" disabled={golpes >= 12} onClick={() => setGolpes(golpes + 1)}>+</button>
        </div>
      </div>
      <div className="resultado">
        <div><small>Recibes</small><b>{recibe}</b></div>
        <div><small>Neto</small><b>{neto}</b><small>{NOMBRE[marcaPGA(neto, par[h])!]}</small></div>
        <div className="pts-grande"><small>Puntos</small><b>{pts}</b></div>
      </div>
    </div>
  )
}
