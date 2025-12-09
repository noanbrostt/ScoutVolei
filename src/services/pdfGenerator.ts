import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

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
const FUNDAMENTALS = ['Passe', 'Defesa', 'Bloqueio', 'Ataque', 'Saque', 'Levantamento'];

const COLORS = {
    primary: '#2196F3',
    positive: '#4CAF50',
    negative: '#F44336',
    neutral: '#BDBDBD',
    empty: '#ddd',
    text: '#333'
};

const PIE_COLORS = {
    3: '#1B5E20', // Dark Green (Perfeito)
    2: '#66BB6A', // Light Green (Bom)
    1: '#FBC02D', // Yellow (Ruim)
    0: '#D32F2F'  // Red (Erro)
};

// --- SVG GENERATORS ---

const generateRadarSVG = (data: Record<string, number>) => {
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
        labelsSVG += `<text x="${labelPoint.split(',')[0]}" y="${labelPoint.split(',')[1]}" font-size="10" text-anchor="middle" fill="#333" font-family="Helvetica">${labelText}</text>`;
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

const generatePieSVG = (counts: {0: number, 1: number, 2: number, 3: number}, title: string) => {
    const size = 150;
    const radius = 60;
    const center = size / 2;
    const total = counts[0] + counts[1] + counts[2] + counts[3];

    if (total === 0) {
        return `
            <svg width="${size}" height="${size + 20}" viewBox="0 0 ${size} ${size + 20}">
                <circle cx="${center}" cy="${center}" r="${radius}" fill="#eee" />
                <text x="${center}" y="${center}" text-anchor="middle" dominant-baseline="middle" fill="#aaa" font-size="12">Sem dados</text>
                <text x="${center}" y="${size + 15}" text-anchor="middle" font-size="14" font-weight="bold" fill="#333">${title}</text>
            </svg>
        `;
    }

    let svgContent = '';
    let cumulativePercent = 0;

    const getCoordinatesForPercent = (percent: number) => {
        const x = center + radius * Math.cos(2 * Math.PI * percent);
        const y = center + radius * Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    // Order: 3, 2, 1, 0
    const order = [3, 2, 1, 0];
    
    order.forEach(quality => {
        const count = counts[quality as keyof typeof counts];
        if (count === 0) return;

        const percent = count / total;
        const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
        
        cumulativePercent += percent;
        
        const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
        const largeArcFlag = percent > 0.5 ? 1 : 0;

        const pathData = [
            `M ${center} ${center}`,
            `L ${startX} ${startY}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
            `Z`
        ].join(' ');

        svgContent += `<path d="${pathData}" fill="${PIE_COLORS[quality as keyof typeof PIE_COLORS]}" stroke="white" stroke-width="1" />`;
    });

    svgContent += `
        <circle cx="${center}" cy="${center}" r="${radius * 0.4}" fill="white" />
        <text x="${center}" y="${center}" text-anchor="middle" dominant-baseline="middle" font-weight="bold" font-size="14" fill="#333">${total}</text>
    `;

    return `
        <svg width="${size}" height="${size + 30}" viewBox="0 0 ${size} ${size + 30}">
            <g transform="rotate(-90 ${center} ${center})">
                ${svgContent}
            </g>
            <text x="${center}" y="${size + 15}" text-anchor="middle" font-size="12" font-weight="bold" fill="#333">${title}</text>
        </svg>
    `;
};

// --- STATS CALCULATOR ---
const calculateStats = (actions: MatchAction[]) => {
    const radar: Record<string, number> = {};
    const bar: Record<string, any> = {};
    const tableData: any[] = [];
    
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
        tableData.push({
            label: f,
            counts,
            total,
            percentages: [0, 1, 2, 3].map(q => total > 0 ? ((counts[q as keyof typeof counts] / total) * 100).toFixed(1) + '%' : '-')
        });
    });

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

    const totalCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };
    actions.forEach(a => {
        if (a.quality >= 0 && a.quality <= 3) {
            totalCounts[a.quality as keyof typeof totalCounts]++;
        }
    });

    return { radar, bar, tableData, totalCounts };
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
        <div class="cover-page">
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
                    <strong>Gráficos:</strong>
                    <p><strong>Positividade (Teia):</strong> Porcentagem de ações "Boas" ou "Perfeitas" (Notas 2 e 3).</p>
                    <p><strong>Eficiência (Barras):</strong> Saldo de qualidade: (Notas Positivas - Notas Negativas) / Total.</p>
                    <p><strong>Gráficos de Pizza:</strong> Distribuição visual da quantidade de cada nota.</p>
                </div>
            </div>
        </div>
        <div style="page-break-after: always;"></div>
    `;
};

// --- HTML GENERATOR ---

const generateHTML = (sectionsHTML: string) => {
    return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 30px; color: #333; }
          
          /* Cover Page Styles */
          .cover-page { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 90vh; }
          .match-title { font-size: 28px; font-weight: bold; margin-bottom: 10px; text-align: center; text-transform: uppercase; }
          .match-date { font-size: 16px; color: #666; margin-bottom: 40px; }
          .final-score { font-size: 60px; font-weight: bold; margin-bottom: 30px; border: 4px solid #333; padding: 10px 40px; border-radius: 10px; }
          .sets-breakdown { margin-bottom: 50px; text-align: center; font-size: 18px; }
          .set-row { margin-bottom: 5px; }
          
          .legend-box { border: 1px solid #ccc; padding: 20px; border-radius: 8px; width: 100%; max-width: 600px; background: #f9f9f9; }
          .legend-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .legend-section { margin-bottom: 15px; }
          .legend-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
          .legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; }
          .dot { width: 12px; height: 12px; border-radius: 50%; }
          p { font-size: 12px; margin: 5px 0; }

          /* Report Styles */
          .section { margin-bottom: 0; border: 1px solid #eee; padding: 20px; border-radius: 8px; page-break-after: always; }
          .section:last-child { page-break-after: auto; }
          
          .section-title { font-size: 20px; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid ${COLORS.primary}; padding-bottom: 5px; text-transform: uppercase; }
          
          .charts-container { display: flex; flex-direction: row; justify-content: space-around; align-items: center; margin-bottom: 30px; }
          .chart-box { text-align: center; }
          
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
          th { background-color: #f9f9f9; color: #333; font-weight: bold; }
          .row-label { font-weight: bold; text-align: left; }
          
          .page-two { margin-top: 20px; }
          .pies-grid { display: flex; flex-direction: row; flex-wrap: wrap; justify-content: center; gap: 20px; }
          .pie-box { width: 30%; display: flex; justify-content: center; margin-bottom: 20px; }
          
          .page-break { page-break-before: always; }
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
    const radarSVG = generateRadarSVG(stats.radar);
    const barSVG = generateBarSVG(stats.bar);

    let piesHTML = '';
    piesHTML += `<div class="pie-box">${generatePieSVG(stats.totalCounts, 'TOTAL ACUMULADO')}</div>`;
    stats.tableData.forEach(row => {
        piesHTML += `<div class="pie-box">${generatePieSVG(row.counts, row.label)}</div>`;
    });

    let tableRows = '';
    stats.tableData.forEach(row => {
        tableRows += `
            <tr>
                <td class="row-label">${row.label}</td>
                <td style="color:${PIE_COLORS[3]}"><strong>${row.counts[3]}</strong><br><span style="font-size:9px; color:#888">${row.percentages[3]}</span></td>
                <td style="color:${PIE_COLORS[2]}"><strong>${row.counts[2]}</strong><br><span style="font-size:9px; color:#888">${row.percentages[2]}</span></td>
                <td style="color:#F9A825"><strong>${row.counts[1]}</strong><br><span style="font-size:9px; color:#888">${row.percentages[1]}</span></td>
                <td style="color:${PIE_COLORS[0]}"><strong>${row.counts[0]}</strong><br><span style="font-size:9px; color:#888">${row.percentages[0]}</span></td>
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

            <div class="page-break"></div>
            
            <div class="page-two">
                <div style="text-align:center; font-weight:bold; margin-bottom:15px; font-size:16px;">Distribuição de Qualidade (Gráficos de Pizza)</div>
                <div class="pies-grid">
                    ${piesHTML}
                </div>
            </div>
        </div>
    `;
};


export const generateMatchPDF = async (match: Match, actions: MatchAction[], players: Player[]) => {
    let finalHTML = '';

    const setsPlayed = Array.from(new Set(actions.map(a => a.setNumber))).sort((a,b) => a-b);

    // Calculate Scores for Filename and Cover
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

    // 1. COVER PAGE
    finalHTML += generateCoverPageHTML(match, actions, setsPlayed);

    // 2. TEAM SECTIONS
    finalHTML += generateSectionHTML(`TIME TODO - JOGO TODO`, actions);

    setsPlayed.forEach(setNum => {
        const setActions = actions.filter(a => a.setNumber === setNum);
        finalHTML += generateSectionHTML(`TIME TODO - ${setNum}º SET`, setActions);
    });

    // 3. PLAYERS SECTIONS
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

    // Rename File
    const date = new Date(match.date);
    const dateStr = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
    const fileName = `${match.teamName || 'Meu Time'} ${setsUs} x ${setsThem} ${match.opponentName} - ${dateStr}.pdf`;
    const safeFileName = fileName.replace(/[^a-z0-9 \-_\.]/gi, '');

    const newPath = `${FileSystem.cacheDirectory}${safeFileName}`;

    try {
        await FileSystem.moveAsync({
            from: uri,
            to: newPath
        });
        await Sharing.shareAsync(newPath, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (e) {
        console.error("Error renaming file:", e);
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    }
};
