import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// --- TYPES ---
interface MatchAction {
    actionType: string;
    quality: number;
    setNumber: number;
    playerId: string | null;
    timestamp: string;
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
const FUNDAMENTALS = ['Passe', 'Defesa', 'Bloqueio', 'Ataque', 'Saque', 'Levantamento'];
const COLORS = {
    primary: '#2196F3',
    positive: '#4CAF50',
    negative: '#F44336',
    neutral: '#BDBDBD',
    empty: '#ddd',
    text: '#333'
};

// --- SVG GENERATORS (String Based) ---

const generateRadarSVG = (data: Record<string, number>) => {
    const size = 300;
    const center = size / 2;
    const radius = 100;
    const levels = 4;
    const angleSlice = (2 * Math.PI) / FUNDAMENTALS.length;

    // Helper to get coords
    const getPoint = (angle: number, value: number) => {
        const x = center + (value * radius) * Math.sin(angle);
        const y = center - (value * radius) * Math.cos(angle);
        return `${x},${y}`;
    };

    // Grid (Levels)
    let gridSVG = '';
    for (let level = 1; level <= levels; level++) {
        const r = (radius / levels) * level;
        const points = FUNDAMENTALS.map((_, i) => {
            const angle = i * angleSlice;
            return getPoint(angle, r / radius); // Normalize r back to scale 0-1 for helper
        }).join(' ');
        gridSVG += `<polygon points="${points}" stroke="#ccc" fill="none" stroke-width="1"/>`;
    }

    // Axes
    let axesSVG = '';
    let labelsSVG = '';
    FUNDAMENTALS.map((f, i) => {
        const angle = i * angleSlice;
        const endPoint = getPoint(angle, 1);
        axesSVG += `<line x1="${center}" y1="${center}" x2="${endPoint.split(',')[0]}" y2="${endPoint.split(',')[1]}" stroke="#ccc" stroke-width="1"/>`;
        
        // Labels
        const labelPoint = getPoint(angle, 1.2);
        const labelText = f === 'Levantamento' ? 'Levant.' : f;
        labelsSVG += `<text x="${labelPoint.split(',')[0]}" y="${labelPoint.split(',')[1]}" font-size="12" text-anchor="middle" fill="#333" font-family="Helvetica">${labelText}</text>`;
    });

    // Data Polygon
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

    // Grid lines (0%, 50%, 100%)
    [0, 0.5, 1].forEach(pct => {
        const yTop = centerY - (pct * centerY);
        const yBottom = centerY + (pct * centerY);
        gridSVG += `<line x1="0" y1="${yTop}" x2="${chartWidth}" y2="${yTop}" stroke="#eee" stroke-dasharray="4"/>`;
        if (pct > 0) gridSVG += `<line x1="0" y1="${yBottom}" x2="${chartWidth}" y2="${yBottom}" stroke="#eee" stroke-dasharray="4"/>`;
    });
    // Center line
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
        
        // Value Label
        if (total > 0) {
            const pctText = (efficiency * 100).toFixed(1) + '%';
            const textY = efficiency >= 0 ? y - 5 : y + barHeight + 12;
            barsSVG += `<text x="${x + barWidth/2}" y="${textY}" font-size="10" text-anchor="middle" fill="#333">${pctText}</text>`;
        }

        // Axis Label
        const labelText = f === 'Levantamento' ? 'Levant.' : f;
        labelsSVG += `<text x="${x + barWidth/2}" y="${chartHeight + 15}" font-size="10" text-anchor="middle" fill="#333">${labelText}</text>`;
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

// --- STATS CALCULATOR ---
const calculateStats = (actions: MatchAction[]) => {
    // 1. Radar Data
    const radar: Record<string, number> = {};
    FUNDAMENTALS.forEach(f => {
        const acts = actions.filter(a => a.actionType === f);
        if (acts.length === 0) radar[f] = 0;
        else {
            const pos = acts.filter(a => a.quality >= 2).length;
            radar[f] = pos / acts.length;
        }
    });

    // 2. Bar Data
    const bar: Record<string, any> = {};
    const tableData: any[] = [];
    
    // Logic for sequence (Atk vs C.Atk) - SIMPLIFIED for PDF (Performance)
    // We recreate the chronological sort for the subset of actions passed
    const sorted = [...actions].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const atkSideOut = [];
    const atkCounter = [];

    sorted.forEach((act, idx) => {
        if (act.actionType === 'Ataque') {
            // Look back 2 steps roughly
            const prev1 = idx > 0 ? sorted[idx - 1] : null;
            const prev2 = idx > 1 ? sorted[idx - 2] : null;
            
            let found = false;
            if (prev1?.actionType === 'Passe') { atkSideOut.push(act); found = true; }
            else if (prev1?.actionType === 'Defesa') { atkCounter.push(act); found = true; }
            else if (prev1?.actionType === 'Levantamento') {
                if (prev2?.actionType === 'Passe') { atkSideOut.push(act); found = true; }
                else if (prev2?.actionType === 'Defesa') { atkCounter.push(act); found = true; }
            }
            if (!found) { /* Default or unknown context, maybe count as generic attack */ }
        }
    });


    FUNDAMENTALS.forEach(f => {
        const acts = actions.filter(a => a.actionType === f);
        const counts = {
            0: acts.filter(a => a.quality === 0).length,
            1: acts.filter(a => a.quality === 1).length,
            2: acts.filter(a => a.quality === 2).length,
            3: acts.filter(a => a.quality === 3).length,
        };
        bar[f] = counts;

        // Table Row Data
        const total = acts.length;
        tableData.push({
            label: f,
            counts,
            total,
            percentages: [0, 1, 2, 3].map(q => total > 0 ? ((counts[q as keyof typeof counts] / total) * 100).toFixed(1) + '%' : '-')
        });
    });

    // Add Atk Sideout & C. Atk to Table Data
    [ {l: 'Atk (Virada)', d: atkSideOut}, {l: 'C. Atk', d: atkCounter} ].forEach(item => {
         const counts = {
            0: item.d.filter(a => a.quality === 0).length,
            1: item.d.filter(a => a.quality === 1).length,
            2: item.d.filter(a => a.quality === 2).length,
            3: item.d.filter(a => a.quality === 3).length,
        };
        const total = item.d.length;
        tableData.push({
            label: item.l,
            counts,
            total,
            percentages: [0, 1, 2, 3].map(q => total > 0 ? ((counts[q as keyof typeof counts] / total) * 100).toFixed(1) + '%' : '-')
        });
    });

    return { radar, bar, tableData };
};

// --- HTML GENERATOR ---

const generateHTML = (match: Match, sectionsHTML: string) => {
    return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
          h1 { text-align: center; color: ${COLORS.primary}; margin-bottom: 5px; }
          h2 { text-align: center; font-size: 14px; color: #666; margin-bottom: 30px; }
          
          .section { margin-bottom: 50px; page-break-inside: avoid; border: 1px solid #eee; padding: 15px; border-radius: 8px; }
          .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid ${COLORS.primary}; padding-bottom: 5px; }
          
          .charts-container { display: flex; flex-direction: row; justify-content: space-around; align-items: center; margin-bottom: 20px; }
          .chart-box { text-align: center; }
          
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: center; }
          th { background-color: #f2f2f2; color: #333; }
          .row-label { font-weight: bold; text-align: left; }
          .quality-3 { color: ${COLORS.positive}; font-weight: bold; }
          .quality-0 { color: ${COLORS.negative}; font-weight: bold; }
          
          .no-data { text-align: center; color: #999; font-style: italic; padding: 20px; }
        </style>
      </head>
      <body>
        <h1>${match.teamName || 'Meu Time'} vs ${match.opponentName}</h1>
        <h2>${new Date(match.date).toLocaleDateString()} - ${match.location || 'Sem Local'}</h2>
        ${sectionsHTML}
      </body>
    </html>
    `;
};

const generateSectionHTML = (title: string, actions: MatchAction[]) => {
    if (actions.length === 0) {
        return `
            <div class="section">
                <div class="section-title">${title}</div>
                <div class="no-data">Nenhuma ação registrada.</div>
            </div>
        `;
    }

    const stats = calculateStats(actions);
    const radarSVG = generateRadarSVG(stats.radar);
    const barSVG = generateBarSVG(stats.bar);

    // Table HTML
    let tableRows = '';
    stats.tableData.forEach(row => {
        tableRows += `
            <tr>
                <td class="row-label">${row.label}</td>
                <td>${row.counts[3]}<br><span style="font-size:9px; color:#888">${row.percentages[3]}</span></td>
                <td>${row.counts[2]}<br><span style="font-size:9px; color:#888">${row.percentages[2]}</span></td>
                <td>${row.counts[1]}<br><span style="font-size:9px; color:#888">${row.percentages[1]}</span></td>
                <td>${row.counts[0]}<br><span style="font-size:9px; color:#888">${row.percentages[0]}</span></td>
                <td><strong>${row.total}</strong></td>
            </tr>
        `;
    });

    return `
        <div class="section">
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
                        <th style="color:${COLORS.positive}">3 (Perfeito)</th>
                        <th>2 (Positivo)</th>
                        <th>1 (Neutro)</th>
                        <th style="color:${COLORS.negative}">0 (Erro)</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;
};


export const generateMatchPDF = async (match: Match, actions: MatchAction[], players: Player[]) => {
    let sectionsHTML = '';

    const setsPlayed = Array.from(new Set(actions.map(a => a.setNumber))).sort((a,b) => a-b);

    // 1. TEAM SECTIONS
    // 1.1 Team - All Game
    sectionsHTML += generateSectionHTML(`TIME TODO - JOGO TODO`, actions);

    // 1.2 Team - Per Set
    setsPlayed.forEach(setNum => {
        const setActions = actions.filter(a => a.setNumber === setNum);
        sectionsHTML += generateSectionHTML(`TIME TODO - ${setNum}º SET`, setActions);
    });

    // 2. PLAYERS SECTIONS (Alphabetical)
    const sortedPlayers = [...players].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    sortedPlayers.forEach(player => {
        const pActions = actions.filter(a => a.playerId === player.id);
        if (pActions.length === 0) return; // Skip players with no actions

        const playerName = (player.surname || player.name).toUpperCase();

        // 2.1 Player - All Game
        sectionsHTML += generateSectionHTML(`${playerName} - JOGO TODO`, pActions);

        // 2.2 Player - Per Set
        setsPlayed.forEach(setNum => {
            const pSetActions = pActions.filter(a => a.setNumber === setNum);
            // Only generate set section if player played (has actions) in that set? 
            // Or show empty? The user asked for "same thing", implies structure. 
            // But showing empty tables for sets a player didn't play is noise. 
            // Let's show only if they have actions to save paper/PDF size.
            if (pSetActions.length > 0) {
                 sectionsHTML += generateSectionHTML(`${playerName} - ${setNum}º SET`, pSetActions);
            }
        });
    });

    const html = generateHTML(match, sectionsHTML);

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
};
