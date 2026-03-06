/* ============================================
   Position Sizer — Core Logic
   ============================================ */

(function () {
  'use strict';

  // --- DOM Elements ---
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const els = {
    btnLong:    $('#btn-long'),
    btnShort:   $('#btn-short'),
    equity:     $('#equity'),
    riskPct:    $('#risk-pct'),
    entryPrice: $('#entry-price'),
    stopPrice:  $('#stop-price'),
    ticker:     $('#ticker'),
    sharesCount:$('#shares-count'),
    maxRisk:    $('#max-risk'),
    posValue:   $('#position-value'),
    riskPerShare:$('#risk-per-share'),
    equityPct:  $('#equity-pct'),
    btn2Stop:   $('#btn-2stop'),
    btn3Stop:   $('#btn-3stop'),
    stopsBody:  $('#stops-body'),
    vizBar:     $('#viz-bar'),
    rrGrid:     $('#rr-grid'),
  };

  // --- State ---
  let direction = 'long'; // 'long' | 'short'
  let stopMode = 2;       // 2 | 3

  // --- Formatters ---
  const fmtInt = (n) => Math.floor(n).toLocaleString('en-US');
  const fmtDollar = (n) => {
    const abs = Math.abs(n);
    const str = abs >= 1000
      ? '$' + abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
      : '$' + abs.toFixed(2);
    return n < 0 ? '-' + str : str;
  };
  const fmtPrice = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtPct = (n) => n.toFixed(1) + '%';

  // --- Core Calculation ---
  function getValues() {
    return {
      equity:   parseFloat(els.equity.value) || 0,
      riskPct:  parseFloat(els.riskPct.value) || 0,
      entry:    parseFloat(els.entryPrice.value) || 0,
      stop:     parseFloat(els.stopPrice.value) || 0,
    };
  }

  function calculate() {
    const v = getValues();
    const riskPerShare = Math.abs(v.entry - v.stop);
    if (riskPerShare === 0 || v.equity === 0) return;

    const maxRisk = v.equity * (v.riskPct / 100);
    const shares = Math.floor(maxRisk / riskPerShare);
    const positionValue = shares * v.entry;
    const equityPct = (positionValue / v.equity) * 100;

    // Update hero
    els.sharesCount.textContent = fmtInt(shares);

    // Update metrics
    els.maxRisk.textContent = fmtDollar(maxRisk);
    els.posValue.textContent = fmtDollar(positionValue);
    els.riskPerShare.textContent = fmtPrice(riskPerShare);
    els.equityPct.textContent = fmtPct(equityPct);

    // Staggered stops
    renderStops(v, shares, riskPerShare);

    // Visualization
    renderViz(v);

    // R:R targets
    renderRR(v, shares, riskPerShare);
  }

  // --- Staggered Stops ---
  function renderStops(v, totalShares, riskPerShare) {
    const rows = [];
    const isLong = direction === 'long';

    // Entry row
    rows.push({
      level: 'Entry',
      price: v.entry,
      shares: '—',
      pctPos: '100%',
      pnl: '—',
      cls: 'level-entry',
    });

    if (stopMode === 2) {
      const midPrice = isLong
        ? v.entry - riskPerShare * 0.5
        : v.entry + riskPerShare * 0.5;
      const halfShares = Math.ceil(totalShares / 2);
      const pnlMid = isLong
        ? halfShares * (midPrice - v.entry)
        : halfShares * (v.entry - midPrice);

      rows.push({
        level: 'Stop 1 (50%)',
        price: midPrice,
        shares: fmtInt(halfShares) + ' sh',
        pctPos: '50%',
        pnl: fmtDollar(pnlMid),
        cls: 'level-stop',
      });

      const remainShares = totalShares - halfShares;
      const pnlFinal = isLong
        ? remainShares * (v.stop - v.entry)
        : remainShares * (v.entry - v.stop);

      rows.push({
        level: 'Final Stop',
        price: v.stop,
        shares: fmtInt(remainShares) + ' sh',
        pctPos: '0%',
        pnl: fmtDollar(pnlFinal),
        cls: 'level-final',
      });
    } else {
      // 3-stop
      const third = Math.ceil(totalShares / 3);
      for (let i = 1; i <= 3; i++) {
        const frac = i / 3;
        const price = isLong
          ? v.entry - riskPerShare * frac
          : v.entry + riskPerShare * frac;
        const sharesOut = i < 3 ? third : totalShares - third * 2;
        const pnl = isLong
          ? sharesOut * (price - v.entry)
          : sharesOut * (v.entry - price);
        const remaining = Math.round((1 - frac) * 100);

        rows.push({
          level: i < 3 ? `Stop ${i} (${Math.round(frac * 100)}%)` : 'Final Stop',
          price: price,
          shares: fmtInt(sharesOut) + ' sh',
          pctPos: remaining + '%',
          pnl: fmtDollar(pnl),
          cls: i < 3 ? 'level-stop' : 'level-final',
        });
      }
    }

    els.stopsBody.innerHTML = rows.map(r => `
      <tr>
        <td class="${r.cls}">${r.level}</td>
        <td class="${r.cls}">${typeof r.price === 'number' ? fmtPrice(r.price) : r.price}</td>
        <td>${r.shares}</td>
        <td>${r.pctPos}</td>
        <td class="${r.pnl !== '—' ? 'pnl-loss' : ''}">${r.pnl}</td>
      </tr>
    `).join('');
  }

  // --- Scale-Out Visualization ---
  function renderViz(v) {
    const isLong = direction === 'long';
    const markers = [];

    // Determine all price points
    const prices = [v.entry];
    if (stopMode === 2) {
      const mid = isLong
        ? v.entry - Math.abs(v.entry - v.stop) * 0.5
        : v.entry + Math.abs(v.entry - v.stop) * 0.5;
      prices.push(mid);
    } else {
      const risk = Math.abs(v.entry - v.stop);
      for (let i = 1; i <= 2; i++) {
        const p = isLong ? v.entry - risk * (i / 3) : v.entry + risk * (i / 3);
        prices.push(p);
      }
    }
    prices.push(v.stop);

    const allPrices = prices.slice();
    const minP = Math.min(...allPrices);
    const maxP = Math.max(...allPrices);
    const range = maxP - minP || 1;
    const pad = 0.08; // 8% padding each side

    function pctPos(price) {
      const norm = (price - minP) / range; // 0..1
      return (pad + norm * (1 - 2 * pad)) * 100;
    }

    // Build markers
    markers.push({ price: v.entry, cls: 'entry', label: fmtPrice(v.entry) });

    // Intermediate stops
    const intermediates = prices.slice(1, -1);
    intermediates.forEach(p => {
      markers.push({ price: p, cls: 'stop-mid', label: fmtPrice(p) });
    });

    markers.push({ price: v.stop, cls: 'stop-final', label: fmtPrice(v.stop) });

    els.vizBar.innerHTML = markers.map(m => {
      const left = pctPos(m.price);
      return `
        <div class="viz-marker ${m.cls}" style="left:${left}%">
          <span class="viz-marker-label">${m.label}</span>
        </div>
      `;
    }).join('');
  }

  // --- R:R Targets ---
  function renderRR(v, shares, riskPerShare) {
    const ratios = [1, 1.5, 2, 3, 4, 5];
    const isLong = direction === 'long';

    els.rrGrid.innerHTML = ratios.map(r => {
      const targetPrice = isLong
        ? v.entry + riskPerShare * r
        : v.entry - riskPerShare * r;
      const profit = shares * riskPerShare * r;

      return `
        <div class="rr-card">
          <div class="rr-ratio">${r}:1 R</div>
          <span class="rr-price">${fmtPrice(targetPrice)}</span>
          <span class="rr-profit">+${fmtDollar(profit)}</span>
        </div>
      `;
    }).join('');
  }

  // --- Event Listeners ---

  // Long / Short toggle
  [els.btnLong, els.btnShort].forEach(btn => {
    btn.addEventListener('click', () => {
      direction = btn.dataset.dir;
      els.btnLong.classList.toggle('active', direction === 'long');
      els.btnShort.classList.toggle('active', direction === 'short');
      calculate();
    });
  });

  // 2-Stop / 3-Stop toggle
  els.btn2Stop.addEventListener('click', () => {
    stopMode = 2;
    els.btn2Stop.classList.add('active');
    els.btn3Stop.classList.remove('active');
    calculate();
  });

  els.btn3Stop.addEventListener('click', () => {
    stopMode = 3;
    els.btn3Stop.classList.add('active');
    els.btn2Stop.classList.remove('active');
    calculate();
  });

  // Input listeners — real-time
  [els.equity, els.riskPct, els.entryPrice, els.stopPrice].forEach(input => {
    input.addEventListener('input', calculate);
  });

  // Initial calc
  calculate();

})();
