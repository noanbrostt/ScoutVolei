import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File } from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';

// --- TYPES ---
interface MatchAction {
    actionType: string;
    quality: number;
    setNumber: number;
    playerId: string | null;
    timestamp: string;
    scoreChange?: number;
}

interface Player {
    id: string;
    name: string;
    surname?: string;
    number: number;
}

interface Match {
    opponentName: string;
    teamName?: string;
    date: string;
    location?: string;
}

// --- CONSTANTS ---
const FUNDAMENTALS = ['Saque', 'Passe', 'Levantamento', 'Ataque', 'Bloqueio', 'Defesa'];

const SCORING_SKILLS = ['Saque', 'Ataque', 'Bloqueio'];
const NON_SCORING_SKILLS = ['Passe', 'Defesa', 'Levantamento'];

const COLORS = {
    primary: '#2196F3',
    positive: '#4CAF50',
    negative: '#F44336',
    neutral: '#BDBDBD',
    empty: '#cccccc', // Darker gray for visibility
    text: '#333'
};

const PIE_COLORS = {
    3: '#2E7D32', // Dark Green (Perfeito)
    2: '#81C784', // Light Green (Bom)
    1: '#FDD835', // Yellow (Ruim)
    0: '#C62828'  // Red (Erro)
};

// --- SVG GENERATORS ---

const generateRadarSVG = (data: Record<string, number>, countsData: Record<string, any>) => {
    const size = 300;
    const center = size / 2;
    const radius = 100;
    const levels = 4;
    const angleSlice = (2 * Math.PI) / FUNDAMENTALS.length;

    const getPoint = (angle: number, value: number) => {
        const x = center + (value * radius) * Math.sin(angle);
        const y = center - (value * radius) * Math.cos(angle);
        return `${x},${y}`;
    };

    let gridSVG = '';
    for (let level = 1; level <= levels; level++) {
        const r = (radius / levels) * level;
        const points = FUNDAMENTALS.map((_, i) => {
            const angle = i * angleSlice;
            return getPoint(angle, r / radius);
        }).join(' ');
        gridSVG += `<polygon points="${points}" stroke="#ccc" fill="none" stroke-width="1"/>`;
    }

    let axesSVG = '';
    let labelsSVG = '';
    FUNDAMENTALS.map((f, i) => {
        const angle = i * angleSlice;
        const endPoint = getPoint(angle, 1);
        axesSVG += `<line x1="${center}" y1="${center}" x2="${endPoint.split(',')[0]}" y2="${endPoint.split(',')[1]}" stroke="#ccc" stroke-width="1"/>`;
        
        const labelPoint = getPoint(angle, 1.25);
        const labelText = f === 'Levantamento' ? 'Levant.' : f;
        
        // Gray out label if no data
        const hasData = countsData[f] && (countsData[f][0] + countsData[f][1] + countsData[f][2] + countsData[f][3] > 0);
        const labelColor = hasData ? '#333' : '#aaa';

        labelsSVG += `<text x="${labelPoint.split(',')[0]}" y="${labelPoint.split(',')[1]}" font-size="10" text-anchor="middle" fill="${labelColor}" font-family="Helvetica">${labelText}</text>`;
    });

    const polyPoints = FUNDAMENTALS.map((f, i) => {
        const angle = i * angleSlice;
        const val = data[f] || 0;
        return getPoint(angle, val);
    }).join(' ');

    return `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            ${gridSVG}
            ${axesSVG}
            <polygon points="${polyPoints}" fill="rgba(33, 150, 243, 0.4)" stroke="${COLORS.primary}" stroke-width="2"/>
            ${labelsSVG}
        </svg>
    `;
};

const generateBarSVG = (data: Record<string, {0:number, 1:number, 2:number, 3:number}>) => {
    const width = 500;
    const height = 250;
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    const barWidth = 40;
    const spacing = (chartWidth - (FUNDAMENTALS.length * barWidth)) / (FUNDAMENTALS.length + 1);
    const centerY = chartHeight / 2;

    let barsSVG = '';
    let labelsSVG = '';
    let gridSVG = '';

    [0, 0.5, 1].forEach(pct => {
        const yTop = centerY - (pct * centerY);
        const yBottom = centerY + (pct * centerY);
        gridSVG += `<line x1="0" y1="${yTop}" x2="${chartWidth}" y2="${yTop}" stroke="#eee" stroke-dasharray="4"/>`;
        if (pct > 0) gridSVG += `<line x1="0" y1="${yBottom}" x2="${chartWidth}" y2="${yBottom}" stroke="#eee" stroke-dasharray="4"/>`;
    });
    gridSVG += `<line x1="0" y1="${centerY}" x2="${chartWidth}" y2="${centerY}" stroke="#aaa" stroke-width="1"/>`;

    FUNDAMENTALS.forEach((f, i) => {
        const item = data[f];
        const total = item[0] + item[1] + item[2] + item[3];
        
        let efficiency = 0;
        if (total > 0) {
            efficiency = (item[3] + item[2] - item[1] - item[0]) / total;
        }

        const barHeight = Math.abs(efficiency) * centerY;
        const x = spacing + (i * (barWidth + spacing));
        const y = efficiency >= 0 ? centerY - barHeight : centerY;
        
        const color = total === 0 ? COLORS.empty : (efficiency > 0 ? COLORS.positive : (efficiency < 0 ? COLORS.negative : COLORS.neutral));
        
        barsSVG += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}"/>`;
        
        if (total > 0) {
            const pctText = (efficiency * 100).toFixed(1) + '%';
            const textY = efficiency >= 0 ? y - 5 : y + barHeight + 12;
            barsSVG += `<text x="${x + barWidth/2}" y="${textY}" font-size="10" text-anchor="middle" fill="#333">${pctText}</text>`;
        }

        const labelText = f === 'Levantamento' ? 'Levant.' : f;
        const labelColor = total > 0 ? '#333' : '#aaa';
        labelsSVG += `<text x="${x + barWidth/2}" y="${chartHeight + 15}" font-size="10" text-anchor="middle" fill="${labelColor}">${labelText}</text>`;
    });

    return `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
            <g transform="translate(${margin.left}, ${margin.top})">
                ${gridSVG}
                ${barsSVG}
                ${labelsSVG}
            </g>
        </svg>
    `;
};

const getCoords = (angleDeg: number, radius: number, center: number) => {
    const angleRad = (angleDeg - 90) * Math.PI / 180.0;
    return {
        x: center + (radius * Math.cos(angleRad)),
        y: center + (radius * Math.sin(angleRad))
    };
};

const generateSplitPieSVG = (counts: {0: number, 1: number, 2: number, 3: number}, title: string) => {
    const size = 200;
    const radius = 70;
    const center = size / 2;
    const total = counts[0] + counts[1] + counts[2] + counts[3];

    // Gray empty state
    if (total === 0) {
        return `
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                <text x="${center}" y="20" text-anchor="middle" font-size="12" fill="#666" font-family="Helvetica">${title}</text>
                <circle cx="${center}" cy="${center}" r="${radius}" fill="${COLORS.empty}" />
                <text x="${center}" y="${center}" text-anchor="middle" dominant-baseline="middle" fill="#666" font-size="14" font-family="Helvetica">Sem dados</text>
            </svg>
        `;
    }

    // Check for 100% single color dominance -> FULL CIRCLE (No hole)
    for (let q = 0; q <= 3; q++) {
        if (counts[q as keyof typeof counts] === total) {
             const textColor = (q === 1) ? '#333' : 'white';
             return `
                <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                    <text x="${center}" y="20" text-anchor="middle" font-size="12" fill="#666" font-family="Helvetica">${title}</text>
                    
                    <!-- Full Solid Circle (No donut hole) -->
                    <circle cx="${center}" cy="${center}" r="${radius}" fill="${PIE_COLORS[q as keyof typeof PIE_COLORS]}" stroke="white" stroke-width="1" />
                    
                    <!-- Label centered -->
                    <text x="${center}" y="${center}" text-anchor="middle" dominant-baseline="middle" fill="${textColor}" font-size="14" font-weight="bold">${counts[q as keyof typeof counts]} - 100%</text>
                </svg>
            `;
        }
    }

    let svgContent = '';
    let currentAngle = 0; 
    
    // 0 - Error (Red)
    if (counts[0] > 0) {
        const deg = (counts[0] / total) * 360;
        const start = getCoords(currentAngle, radius, center);
        const end = getCoords(currentAngle + deg, radius, center);
        const mid = getCoords(currentAngle + (deg/2), radius * 0.65, center);
        const largeArc = deg > 180 ? 1 : 0;
        
        svgContent += `<path d="M ${center} ${center} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z" fill="${PIE_COLORS[0]}" stroke="white" stroke-width="1" />`;
        
        if (counts[0] / total > 0.05) {
            const pct = Math.round((counts[0]/total)*100);
            svgContent += `<text x="${mid.x}" y="${mid.y}" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="10" font-weight="bold">${counts[0]} - ${pct}%</text>`;
        }
        currentAngle += deg;
    }

    // 1 - Poor (Yellow)
    if (counts[1] > 0) {
        const deg = (counts[1] / total) * 360;
        const start = getCoords(currentAngle, radius, center);
        const end = getCoords(currentAngle + deg, radius, center);
        const mid = getCoords(currentAngle + (deg/2), radius * 0.65, center);
        const largeArc = deg > 180 ? 1 : 0;
        
        svgContent += `<path d="M ${center} ${center} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z" fill="${PIE_COLORS[1]}" stroke="white" stroke-width="1" />`;
        
        if (counts[1] / total > 0.05) {
            const pct = Math.round((counts[1]/total)*100);
            svgContent += `<text x="${mid.x}" y="${mid.y}" text-anchor="middle" dominant-baseline="middle" fill="#333" font-size="10" font-weight="bold">${counts[1]} - ${pct}%</text>`;
        }
        currentAngle += deg;
    }

    currentAngle = 0;

    // 3 - Perfect (Dark Green)
    if (counts[3] > 0) {
        const deg = (counts[3] / total) * 360;
        const startAngle = 360 - deg;
        const endAngle = 360;
        
        const start = getCoords(startAngle, radius, center);
        const end = getCoords(endAngle, radius, center);
        const mid = getCoords(startAngle + (deg/2), radius * 0.65, center);
        const largeArc = deg > 180 ? 1 : 0;

        svgContent += `<path d="M ${center} ${center} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z" fill="${PIE_COLORS[3]}" stroke="white" stroke-width="1" />`;
        
        if (counts[3] / total > 0.05) {
            const pct = Math.round((counts[3]/total)*100);
            svgContent += `<text x="${mid.x}" y="${mid.y}" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="10" font-weight="bold">${counts[3]} - ${pct}%</text>`;
        }
        currentAngle = startAngle;
    } else {
        currentAngle = 360;
    }

    // 2 - Good (Light Green)
    if (counts[2] > 0) {
        const deg = (counts[2] / total) * 360;
        const startAngle = currentAngle - deg;
        const endAngle = currentAngle;
        
        const start = getCoords(startAngle, radius, center);
        const end = getCoords(endAngle, radius, center);
        const mid = getCoords(startAngle + (deg/2), radius * 0.65, center);
        const largeArc = deg > 180 ? 1 : 0;

        svgContent += `<path d="M ${center} ${center} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z" fill="${PIE_COLORS[2]}" stroke="white" stroke-width="1" />`;
        
        if (counts[2] / total > 0.05) {
            const pct = Math.round((counts[2]/total)*100);
            svgContent += `<text x="${mid.x}" y="${mid.y}" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="10" font-weight="bold">${counts[2]} - ${pct}%</text>`;
        }
    }

    return `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            <text x="${center}" y="20" text-anchor="middle" font-size="12" font-weight="bold" fill="#333" font-family="Helvetica">${title}</text>
            ${svgContent}
        </svg>
    `;
};

// --- STATS CALCULATOR ---
const calculateStats = (actions: MatchAction[]) => {
    const radar: Record<string, number> = {};
    const bar: Record<string, any> = {};
    const tableData: any[] = [];
    const pieChartsData: any[] = [];
    
    const sorted = [...actions].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const atkSideOut: MatchAction[] = [];
    const atkCounter: MatchAction[] = [];

    sorted.forEach((act, idx) => {
        if (act.actionType === 'Ataque') {
            const prev1 = idx > 0 ? sorted[idx - 1] : null;
            const prev2 = idx > 1 ? sorted[idx - 2] : null;
            
            let found = false;
            if (prev1?.actionType === 'Passe') { atkSideOut.push(act); found = true; }
            else if (prev1?.actionType === 'Defesa') { atkCounter.push(act); found = true; }
            else if (prev1?.actionType === 'Levantamento') {
                if (prev2?.actionType === 'Passe') { atkSideOut.push(act); found = true; }
                else if (prev2?.actionType === 'Defesa') { atkCounter.push(act); found = true; }
            }
        }
    });

    // Fundamentals
    FUNDAMENTALS.forEach(f => {
        const acts = actions.filter(a => a.actionType === f);
        if (acts.length === 0) radar[f] = 0;
        else {
            const pos = acts.filter(a => a.quality >= 2).length;
            radar[f] = pos / acts.length;
        }

        const counts = {
            0: acts.filter(a => a.quality === 0).length,
            1: acts.filter(a => a.quality === 1).length,
            2: acts.filter(a => a.quality === 2).length,
            3: acts.filter(a => a.quality === 3).length,
        };
        bar[f] = counts;

        const total = acts.length;
        const rowData = {
            label: f,
            counts,
            total,
            percentages: [0, 1, 2, 3].map(q => total > 0 ? ((counts[q as keyof typeof counts] / total) * 100).toFixed(1) + '%' : '-')
        };
        tableData.push(rowData);
        pieChartsData.push(rowData);
    });

    // Add Specials
    [ {l: 'Atk', d: atkSideOut}, {l: 'C. Atk', d: atkCounter} ].forEach(item => {
         const counts = {
            0: item.d.filter(a => a.quality === 0).length,
            1: item.d.filter(a => a.quality === 1).length,
            2: item.d.filter(a => a.quality === 2).length,
            3: item.d.filter(a => a.quality === 3).length,
        };
        const total = item.d.length;
        const rowData = {
            label: item.l,
            counts,
            total,
            percentages: [0, 1, 2, 3].map(q => total > 0 ? ((counts[q as keyof typeof counts] / total) * 100).toFixed(1) + '%' : '-')
        };
        tableData.push(rowData);
        pieChartsData.push(rowData);
    });

    // Aggregates for Pie Charts
    const scoringActions = actions.filter(a => SCORING_SKILLS.includes(a.actionType));
    const nonScoringActions = actions.filter(a => NON_SCORING_SKILLS.includes(a.actionType));
    
    const getAggregateCounts = (acts: MatchAction[]) => ({
        0: acts.filter(a => a.quality === 0).length,
        1: acts.filter(a => a.quality === 1).length,
        2: acts.filter(a => a.quality === 2).length,
        3: acts.filter(a => a.quality === 3).length,
    });

    const scoringCounts = getAggregateCounts(scoringActions);
    const nonScoringCounts = getAggregateCounts(nonScoringActions);
    const totalCounts = getAggregateCounts(actions);

    return { radar, bar, tableData, pieChartsData, totalCounts, scoringCounts, nonScoringCounts };
};

// --- COVER PAGE GENERATOR ---
const generateCoverPageHTML = (match: Match, actions: MatchAction[], setsPlayed: number[]) => {
    // Calculate Final Score and Set Breakdown
    let setsUs = 0;
    let setsThem = 0;
    let breakdownHTML = '';

    setsPlayed.forEach(setNum => {
        const setActions = actions.filter(a => a.setNumber === setNum);
        let scoreUs = 0;
        let scoreThem = 0;
        
        setActions.forEach(a => {
            if (a.scoreChange === 1) scoreUs++;
            if (a.scoreChange === -1) scoreThem++;
        });

        if (scoreUs > scoreThem) setsUs++;
        else if (scoreThem > scoreUs) setsThem++;

        breakdownHTML += `
            <div class="set-row">
                <span class="set-label">${setNum}º Set:</span>
                <span class="set-score"><strong>${scoreUs}</strong> x <strong>${scoreThem}</strong></span>
            </div>
        `;
    });

    return `
        <div class="report-page">
            <div class="match-title">${match.teamName || 'Meu Time'} <span style="margin:0 10px">vs</span> ${match.opponentName}</div>
            <div class="match-date">${new Date(match.date).toLocaleDateString()} - ${match.location || 'Sem Local'}</div>
            
            <div class="final-score">
                <span style="color:${COLORS.primary}">${setsUs}</span> x <span style="color:${COLORS.negative}">${setsThem}</span>
            </div>

            <div class="sets-breakdown">
                ${breakdownHTML}
            </div>

            <div class="legend-box">
                <div class="legend-title">Legenda e Explicações</div>
                
                <div class="legend-section">
                    <strong>Notas de Avaliação:</strong>
                    <div class="legend-grid">
                        <div class="legend-item"><div class="dot" style="background:${PIE_COLORS[3]}"></div> 3 - Perfeito (Ponto direto / Ação excelente)</div>
                        <div class="legend-item"><div class="dot" style="background:${PIE_COLORS[2]}"></div> 2 - Bom (Continuidade / Positivo)</div>
                        <div class="legend-item"><div class="dot" style="background:${PIE_COLORS[1]}"></div> 1 - Ruim (Quebra passe / Devolução de graça)</div>
                        <div class="legend-item"><div class="dot" style="background:${PIE_COLORS[0]}"></div> 0 - Erro (Ponto do adversário)</div>
                    </div>
                </div>

                <div class="legend-section">
                    <strong>Conceitos e Métricas:</strong>
                    <p><strong>Positividade:</strong> Porcentagem de ações consideradas positivas (Nota 3 + Nota 2) sobre o total.</p>
                    <p><strong>Eficiência:</strong> Saldo de qualidade (Positivas - Negativas) dividido pelo total.</p>
                    <p><strong>Atk (Side-out):</strong> Ataque realizado imediatamente após a recepção do saque adversário (Virada de bola).</p>
                    <p><strong>C. Atk (Contra-Ataque):</strong> Ataque realizado após a defesa de um ataque adversário.</p>
                </div>
            </div>
        </div>
    `;
};

// --- HTML GENERATOR ---

const generateHTML = (sectionsHTML: string) => {
    return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 0; margin: 0; color: #333; }
          
          /* Page Container for centering */
          .report-page { 
              height: 100vh; 
              width: 100%;
              display: flex; 
              flex-direction: column; 
              justify-content: center; 
              padding: 40px; 
              box-sizing: border-box; 
              page-break-after: always;
          }
          .report-page:last-child { page-break-after: auto; }

          /* Cover Page Specifics */
          .match-title { font-size: 28px; font-weight: bold; margin-bottom: 10px; text-align: center; text-transform: uppercase; }
          .match-date { font-size: 16px; color: #666; margin-bottom: 40px; text-align: center; }
          .final-score { font-size: 60px; font-weight: bold; margin: 0 auto 30px auto; border: 4px solid #333; padding: 10px 40px; border-radius: 10px; width: fit-content; }
          .sets-breakdown { margin-bottom: 50px; text-align: center; font-size: 18px; }
          .set-row { margin-bottom: 5px; }
          .legend-box { border: 1px solid #ccc; padding: 20px; border-radius: 8px; width: 100%; max-width: 600px; background: #f9f9f9; margin: 0 auto; }
          .legend-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .legend-section { margin-bottom: 15px; }
          .legend-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
          .legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; }
          .dot { width: 12px; height: 12px; border-radius: 50%; }
          p { font-size: 12px; margin: 5px 0; }

          /* Report Content Styles */
          .section-title { font-size: 22px; font-weight: bold; margin-bottom: 30px; border-bottom: 2px solid ${COLORS.primary}; padding-bottom: 5px; text-transform: uppercase; text-align: center; }
          
          .charts-container { display: flex; flex-direction: row; justify-content: space-around; align-items: center; margin-bottom: 30px; }
          .chart-box { text-align: center; }
          
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
          th { background-color: #f9f9f9; color: #333; font-weight: bold; }
          .row-label { font-weight: bold; text-align: left; }
          
          .pies-grid { display: flex; flex-direction: row; flex-wrap: wrap; justify-content: space-between; row-gap: 20px; margin-top: 20px; }
          .pie-box { width: 32%; display: flex; justify-content: center; } 
        </style>
      </head>
      <body>
        ${sectionsHTML}
      </body>
    </html>
    `;
};

const generateSectionHTML = (title: string, actions: MatchAction[]) => {
    if (actions.length === 0) return '';

    const stats = calculateStats(actions);
    const radarSVG = generateRadarSVG(stats.radar, stats.bar);
    const barSVG = generateBarSVG(stats.bar);

    let piesHTML = '';
    piesHTML += `<div class="pie-box">${generateSplitPieSVG(stats.scoringCounts, 'Total Scoring Skills')}</div>`;
    piesHTML += `<div class="pie-box">${generateSplitPieSVG(stats.nonScoringCounts, 'Total Non-Scoring Skills')}</div>`;
    piesHTML += `<div class="pie-box">${generateSplitPieSVG(stats.totalCounts, 'Total de Ações')}</div>`;
    
    stats.pieChartsData.forEach(row => {
        piesHTML += `<div class="pie-box">${generateSplitPieSVG(row.counts, row.label)}</div>`;
    });

    let tableRows = '';
    stats.tableData.forEach(row => {
        const isGray = row.total === 0;
        const rowStyle = isGray ? 'style="color:#999"' : '';
        
        let labelStyle = '';
        if (!isGray && (row.label === 'Atk' || row.label === 'C. Atk')) {
            labelStyle = `style="color:${COLORS.primary}"`;
        }

        const cellStyle3 = isGray ? '' : `style="color:${PIE_COLORS[3]}"`;
        const cellStyle2 = isGray ? '' : `style="color:${PIE_COLORS[2]}"`;
        const cellStyle1 = isGray ? '' : `style="color:#F9A825"`;
        const cellStyle0 = isGray ? '' : `style="color:${PIE_COLORS[0]}"`;

        tableRows += `
            <tr ${rowStyle}>
                <td class="row-label" ${labelStyle}>${row.label}</td>
                <td ${cellStyle3}><strong>${row.counts[3]}</strong><br><span style="font-size:9px; color:#888">${row.percentages[3]}</span></td>
                <td ${cellStyle2}><strong>${row.counts[2]}</strong><br><span style="font-size:9px; color:#888">${row.percentages[2]}</span></td>
                <td ${cellStyle1}><strong>${row.counts[1]}</strong><br><span style="font-size:9px; color:#888">${row.percentages[1]}</span></td>
                <td ${cellStyle0}><strong>${row.counts[0]}</strong><br><span style="font-size:9px; color:#888">${row.percentages[0]}</span></td>
                <td><strong>${row.total}</strong></td>
            </tr>
        `;
    });

    return `
        <!-- Page 1: Summary Charts & Table -->
        <div class="report-page">
            <div class="section-title">${title}</div>
            
            <div class="charts-container">
                <div class="chart-box">
                    <div style="font-weight:bold; margin-bottom:5px;">Positividade</div>
                    ${radarSVG}
                </div>
                <div class="chart-box">
                    <div style="font-weight:bold; margin-bottom:5px;">Eficiência</div>
                    ${barSVG}
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="text-align:left">Fundamento</th>
                        <th style="color:${PIE_COLORS[3]}">3 (Perfeito)</th>
                        <th style="color:${PIE_COLORS[2]}">2 (Bom)</th>
                        <th style="color:#F9A825">1 (Ruim)</th>
                        <th style="color:${PIE_COLORS[0]}">0 (Erro)</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>

        <!-- Page 2: Pies -->
        <div class="report-page">
            <div class="pies-grid">
                ${piesHTML}
            </div>
        </div>
    `;
};

export const generateMatchPDF = async (match: Match, actions: MatchAction[], players: Player[]) => {
    let finalHTML = '';

    const setsPlayed = Array.from(new Set(actions.map(a => a.setNumber))).sort((a,b) => a-b);

    let setsUs = 0;
    let setsThem = 0;
    setsPlayed.forEach(setNum => {
        const setActions = actions.filter(a => a.setNumber === setNum);
        let scoreUs = 0;
        let scoreThem = 0;
        setActions.forEach(a => {
            if (a.scoreChange === 1) scoreUs++;
            if (a.scoreChange === -1) scoreThem++;
        });
        if (scoreUs > scoreThem) setsUs++;
        else if (scoreThem > scoreUs) setsThem++;
    });

    finalHTML += generateCoverPageHTML(match, actions, setsPlayed);
    finalHTML += generateSectionHTML(`TIME TODO - JOGO TODO`, actions);

    setsPlayed.forEach(setNum => {
        const setActions = actions.filter(a => a.setNumber === setNum);
        finalHTML += generateSectionHTML(`TIME TODO - ${setNum}º SET`, setActions);
    });

    const sortedPlayers = [...players].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    sortedPlayers.forEach(player => {
        const pActions = actions.filter(a => a.playerId === player.id);
        if (pActions.length === 0) return;

        const playerName = (player.surname || player.name).toUpperCase();
        finalHTML += generateSectionHTML(`${playerName} - JOGO TODO`, pActions);

        setsPlayed.forEach(setNum => {
            const pSetActions = pActions.filter(a => a.setNumber === setNum);
            if (pSetActions.length > 0) {
                 finalHTML += generateSectionHTML(`${playerName} - ${setNum}º SET`, pSetActions);
            }
        });
    });

    const html = generateHTML(finalHTML);
    const { uri } = await Print.printToFileAsync({ html });

    const date = new Date(match.date);
    const dateStr = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
    const fileName = `${match.teamName || 'Meu Time'} ${setsUs} x ${setsThem} ${match.opponentName} - ${dateStr}.pdf`;
    const safeFileName = fileName.replace(/[^a-z0-9 \-_\.]/gi, '');
    
    const newPath = `${FileSystemLegacy.cacheDirectory}${safeFileName}`;

    try {
        const fileInfo = await FileSystemLegacy.getInfoAsync(newPath);
        if (fileInfo.exists) {
            await FileSystemLegacy.deleteAsync(newPath, { idempotent: true });
        }

        const sourceFile = new File(uri);
        const destinationFile = new File(newPath);
        await sourceFile.copy(destinationFile);

        await Sharing.shareAsync(newPath, { UTI: '.pdf', mimeType: 'application/pdf' });
        await FileSystemLegacy.deleteAsync(uri, { idempotent: true });
    } catch (e) {
        console.error("Error renaming file:", e);
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    }
};