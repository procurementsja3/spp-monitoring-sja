import React, { useState, useRef } from 'react';
import { SPPItem, SJAArea } from '../types';
import { AREA_METADATA } from '../utils/initialData';
import {
  Sparkles,
  Info,
  CheckCircle2,
  Clock,
  FileText,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

export interface PICMetricData {
  pic: string;
  total: number;
  closed: number;
  open: number;
  ontime: number;
  late: number;
  ontimeRate: number;
  avgDays: number;
  tier: string;
  items: SPPItem[];
  area?: SJAArea;
}

interface TooltipInfo {
  picData: PICMetricData;
  barType: 'TOTAL' | 'CLOSED' | 'OPEN' | 'ONTIME' | 'DURATION';
  barLabel: string;
  barValue: string | number;
  barColor: string;
  x: number;
  y: number;
}

interface IsometricPicBarChartProps {
  metrics: PICMetricData[];
  selectedMetric: 'MULTI' | 'ONTIME' | 'DURATION';
  onSelectPic?: (picName: string) => void;
  activePic?: string | null;
}

export const IsometricPicBarChart: React.FC<IsometricPicBarChartProps> = ({
  metrics,
  selectedMetric,
  onSelectPic,
  activePic,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [hoveredPic, setHoveredPic] = useState<string | null>(null);

  if (metrics.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400">
        Belum ada data untuk ditampilkan dalam grafik 3D isometrik.
      </div>
    );
  }

  // Cari nilai maksimum untuk penskalaan tinggi pilar 3D
  const maxTotal = Math.max(...metrics.map((m) => m.total), 1);
  const maxDays = Math.max(...metrics.map((m) => m.avgDays), 12);
  const maxBarH = 150; // Tinggi maksimal pilar 3D dalam pixel
  const baseY = 245;   // Garis dasar bidang isometrik

  // Helper menangani show / hide tooltip saat kursor diarahkan ke grafik bar
  const handleBarMouseEnter = (
    e: React.MouseEvent,
    picData: PICMetricData,
    barType: 'TOTAL' | 'CLOSED' | 'OPEN' | 'ONTIME' | 'DURATION',
    barLabel: string,
    barValue: string | number,
    barColor: string
  ) => {
    setHoveredPic(picData.pic);
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setTooltip({
      picData,
      barType,
      barLabel,
      barValue,
      barColor,
      x,
      y,
    });
  };

  const handleBarMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || !tooltip) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTooltip((prev) => (prev ? { ...prev, x, y } : null));
  };

  const handleBarMouseLeave = () => {
    setHoveredPic(null);
    setTooltip(null);
  };

  // Helper menggambar 1 Pilar 3D Isometrik lengkap dengan 3 sisi (Atas, Kiri/Depan, Kanan/Samping)
  const render3DPillar = ({
    x,
    y,
    width,
    height,
    colors,
    label,
    value,
    picData,
    barType,
  }: {
    x: number;
    y: number;
    width: number;
    height: number;
    colors: { top: string; front: string; side: string; border: string; glow: string };
    label: string;
    value: string | number;
    picData: PICMetricData;
    barType: 'TOTAL' | 'CLOSED' | 'OPEN' | 'ONTIME' | 'DURATION';
  }) => {
    const colW = width / 2;
    const slope = colW * 0.42; // Kemiringan isometrik 2:1 standard
    const h = Math.max(height, 8); // Minimal tinggi agar tetap terlihat 3D

    // Titik-titik sudut pilar 3D
    const pBottomLeft = `${x},${y}`;
    const pBottomCenter = `${x + colW},${y + slope}`;
    const pBottomRight = `${x + width},${y}`;

    const pTopLeft = `${x},${y - h}`;
    const pTopCenter = `${x + colW},${y + slope - h}`;
    const pTopRight = `${x + width},${y - h}`;
    const pTopPeak = `${x + colW},${y - slope - h}`;

    const isHovered = hoveredPic === picData.pic;
    const isThisBarHovered = tooltip?.picData.pic === picData.pic && tooltip.barType === barType;

    return (
      <g
        className="cursor-pointer transition-all duration-300"
        onMouseEnter={(e) =>
          handleBarMouseEnter(e, picData, barType, label, value, colors.front)
        }
        onMouseMove={handleBarMouseMove}
        onMouseLeave={handleBarMouseLeave}
        onClick={() => onSelectPic?.(picData.pic)}
      >
        {/* Bayangan Lantai Isometrik (Ambient Shadow) */}
        <ellipse
          cx={x + colW}
          cy={y + slope * 0.8}
          rx={colW * 1.25}
          ry={slope * 1.1}
          fill="black"
          opacity={isThisBarHovered ? 0.35 : 0.22}
          className="blur-xs"
        />

        {/* Sisi Kiri / Depan (Front Face) */}
        <polygon
          points={`${pBottomLeft} ${pBottomCenter} ${pTopCenter} ${pTopLeft}`}
          fill={colors.front}
          stroke={isThisBarHovered ? '#ffffff' : colors.border}
          strokeWidth={isThisBarHovered ? '1.5' : '0.75'}
          className="transition-colors duration-150"
        />

        {/* Sisi Kanan / Samping (Side Face - Lebih gelap untuk ilusi kedalaman 3D) */}
        <polygon
          points={`${pBottomCenter} ${pBottomRight} ${pTopRight} ${pTopCenter}`}
          fill={colors.side}
          stroke={isThisBarHovered ? '#ffffff' : colors.border}
          strokeWidth={isThisBarHovered ? '1.5' : '0.75'}
          className="transition-colors duration-150"
        />

        {/* Sisi Atas (Top Diamond / Specular Cap - Paling terang terkena cahaya atas) */}
        <polygon
          points={`${pTopLeft} ${pTopCenter} ${pTopRight} ${pTopPeak}`}
          fill={colors.top}
          stroke={isThisBarHovered ? '#ffffff' : colors.border}
          strokeWidth={isThisBarHovered ? '1.5' : '0.75'}
          className="transition-colors duration-150"
        />

        {/* Floating Value Pill di Atas Pilar 3D */}
        <g transform={`translate(${x + colW}, ${y - slope - h - 10})`}>
          <rect
            x={-18}
            y={-14}
            width={36}
            height={16}
            rx={4}
            fill="#0f172a"
            opacity={isThisBarHovered ? 1 : 0.88}
            stroke={isThisBarHovered ? '#ffffff' : colors.top}
            strokeWidth={isThisBarHovered ? '1.5' : '1'}
          />
          <text
            x={0}
            y={-3}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="9"
            fontWeight="bold"
            fontFamily="monospace"
          >
            {value}
          </text>
        </g>
      </g>
    );
  };

  // Lebar per kluster personil di sumbu horizontal
  const clusterWidth = Math.max(140, Math.floor(820 / Math.max(metrics.length, 1)));
  const totalSvgWidth = Math.max(860, metrics.length * clusterWidth + 80);
  const totalSvgHeight = 360;

  return (
    <div className="space-y-3">
      {/* Visual Canvas 3D Isometrik dengan Sistem Tooltip Show/Hide */}
      <div
        ref={containerRef}
        onMouseLeave={handleBarMouseLeave}
        className="relative w-full overflow-x-auto rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-4 sm:p-6 border border-slate-800 shadow-xl select-none"
      >
        {/* Latar Belakang Garis Kisi-Kisi Isometrik */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />

        {/* Legend / Petunjuk Warna 3D */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <span className="font-bold text-white text-xs block">
                Grafik Batang 3D Isometrik Kinerja Personil PIC
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Arahkan kursor ke pilar grafik untuk menampilkan keterangan informasi data (Show / Hide)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3.5 text-[11px] font-medium flex-wrap">
            {selectedMetric === 'MULTI' ? (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-emerald-500 border border-emerald-400 shadow-xs" />
                  <span>PO Close (Selesai)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-amber-500 border border-amber-400 shadow-xs" />
                  <span>PO Open (Antrean)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-blue-500 border border-blue-400 shadow-xs" />
                  <span>Total SPP Masuk</span>
                </span>
              </>
            ) : selectedMetric === 'ONTIME' ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-emerald-500 border border-emerald-400 shadow-xs" />
                <span>Rasio Ketepatan SLA (%) · Target Benchmark 100%</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-purple-500 border border-purple-400 shadow-xs" />
                <span>Rata-rata Hari Proses · Toleransi SLA 10 Hari Kerja</span>
              </span>
            )}
          </div>
        </div>

        {/* SVG Rendering 3D Isometrik */}
        <div className="relative min-w-[780px] overflow-hidden pt-2">
          <svg
            viewBox={`0 0 ${totalSvgWidth} ${totalSvgHeight}`}
            className="w-full h-auto overflow-visible"
            style={{ minHeight: '330px' }}
          >
            <defs>
              <linearGradient id="podiumTopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="podiumSideGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#020617" />
              </linearGradient>
            </defs>

            {/* Garis Bantu Grid Lantai Isometrik */}
            <g opacity={0.15}>
              {Array.from({ length: 9 }).map((_, i) => {
                const gy = 190 + i * 16;
                return (
                  <line
                    key={i}
                    x1={20}
                    y1={gy}
                    x2={totalSvgWidth - 20}
                    y2={gy}
                    stroke="#94a3b8"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                );
              })}
            </g>

            {/* Garis Benchmark Target SLA */}
            {selectedMetric === 'ONTIME' && (
              <g>
                <line
                  x1={30}
                  y1={baseY - maxBarH}
                  x2={totalSvgWidth - 30}
                  y2={baseY - maxBarH}
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                  opacity={0.6}
                />
                <text
                  x={totalSvgWidth - 35}
                  y={baseY - maxBarH - 5}
                  textAnchor="end"
                  fill="#34d399"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  Target Kepatuhan SLA: 100%
                </text>
              </g>
            )}

            {selectedMetric === 'DURATION' && (
              <g>
                {(() => {
                  const targetY = baseY - (10 / maxDays) * maxBarH;
                  return (
                    <>
                      <line
                        x1={30}
                        y1={targetY}
                        x2={totalSvgWidth - 30}
                        y2={targetY}
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                        strokeDasharray="6 4"
                        opacity={0.65}
                      />
                      <text
                        x={totalSvgWidth - 35}
                        y={targetY - 5}
                        textAnchor="end"
                        fill="#fbbf24"
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        Batas Toleransi SLA: 10 Hari Kerja
                      </text>
                    </>
                  );
                })()}
              </g>
            )}

            {/* Render Masing-Masing Personil PIC */}
            {metrics.map((p, idx) => {
              const startX = 60;
              const centerX = startX + idx * clusterWidth + clusterWidth / 2;
              const isSelected = activePic === p.pic;
              const isHovered = hoveredPic === p.pic;

              // Dimensi podium isometrik
              const podW = 52;
              const podSlope = podW * 0.38;
              const podBaseY = baseY + 20;

              return (
                <g key={p.pic} className="transition-all duration-300">
                  {/* Podium Base Isometrik (Lantai Pijakan 3D) */}
                  <g
                    className="cursor-pointer"
                    onClick={() => onSelectPic?.(p.pic)}
                    onMouseEnter={(e) =>
                      handleBarMouseEnter(e, p, 'TOTAL', 'Ringkasan Seluruh SPP', p.total, '#3b82f6')
                    }
                    onMouseMove={handleBarMouseMove}
                    onMouseLeave={handleBarMouseLeave}
                  >
                    {/* Sisi Atas Podium (Belah Ketupat Isometrik) */}
                    <polygon
                      points={`
                        ${centerX - podW},${podBaseY}
                        ${centerX},${podBaseY + podSlope}
                        ${centerX + podW},${podBaseY}
                        ${centerX},${podBaseY - podSlope}
                      `}
                      fill={isSelected ? '#1e3a8a' : isHovered ? '#1e293b' : 'url(#podiumTopGrad)'}
                      stroke={isSelected ? '#3b82f6' : isHovered ? '#60a5fa' : '#334155'}
                      strokeWidth={isSelected ? '2' : '1'}
                    />

                    {/* Sisi Kiri Bawah Podium */}
                    <polygon
                      points={`
                        ${centerX - podW},${podBaseY}
                        ${centerX},${podBaseY + podSlope}
                        ${centerX},${podBaseY + podSlope + 8}
                        ${centerX - podW},${podBaseY + 8}
                      `}
                      fill="url(#podiumSideGrad)"
                      stroke="#1e293b"
                      strokeWidth="1"
                    />

                    {/* Sisi Kanan Bawah Podium */}
                    <polygon
                      points={`
                        ${centerX},${podBaseY + podSlope}
                        ${centerX + podW},${podBaseY}
                        ${centerX + podW},${podBaseY + 8}
                        ${centerX},${podBaseY + podSlope + 8}
                      `}
                      fill="#020617"
                      stroke="#1e293b"
                      strokeWidth="1"
                    />
                  </g>

                  {/* Tiga Pilar 3D Isometrik per Personil (Total, Close, Open) */}
                  {selectedMetric === 'MULTI' && (
                    <>
                      {/* Pilar 1 (Belakang-Kiri): Total SPP (Biru) */}
                      {render3DPillar({
                        x: centerX - 36,
                        y: baseY - 6,
                        width: 22,
                        height: (p.total / maxTotal) * maxBarH,
                        colors: {
                          top: '#60a5fa',
                          front: '#3b82f6',
                          side: '#1d4ed8',
                          border: '#93c5fd',
                          glow: '#3b82f6',
                        },
                        label: 'Total SPP Masuk',
                        value: p.total,
                        picData: p,
                        barType: 'TOTAL',
                      })}

                      {/* Pilar 2 (Tengah-Depan): PO Close (Hijau Selesai) */}
                      {render3DPillar({
                        x: centerX - 11,
                        y: baseY + 4,
                        width: 22,
                        height: (p.closed / maxTotal) * maxBarH,
                        colors: {
                          top: '#34d399',
                          front: '#10b981',
                          side: '#047857',
                          border: '#6ee7b7',
                          glow: '#10b981',
                        },
                        label: 'PO Selesai (Close)',
                        value: p.closed,
                        picData: p,
                        barType: 'CLOSED',
                      })}

                      {/* Pilar 3 (Kanan-Depan): PO Open (Kuning/Oranye Antrean) */}
                      {render3DPillar({
                        x: centerX + 14,
                        y: baseY + 14,
                        width: 22,
                        height: (p.open / maxTotal) * maxBarH,
                        colors: {
                          top: '#fbbf24',
                          front: '#f59e0b',
                          side: '#b45309',
                          border: '#fde68a',
                          glow: '#f59e0b',
                        },
                        label: 'PO Antrean (Open)',
                        value: p.open,
                        picData: p,
                        barType: 'OPEN',
                      })}
                    </>
                  )}

                  {selectedMetric === 'ONTIME' && (
                    /* Mode Pilar Tunggal: Kepatuhan SLA % */
                    render3DPillar({
                      x: centerX - 16,
                      y: baseY + 5,
                      width: 32,
                      height: (p.ontimeRate / 100) * maxBarH,
                      colors: {
                        top: p.ontimeRate >= 80 ? '#34d399' : '#f87171',
                        front: p.ontimeRate >= 80 ? '#10b981' : '#ef4444',
                        side: p.ontimeRate >= 80 ? '#047857' : '#b91c1c',
                        border: p.ontimeRate >= 80 ? '#6ee7b7' : '#fca5a5',
                        glow: p.ontimeRate >= 80 ? '#10b981' : '#ef4444',
                      },
                      label: 'Tingkat Kepatuhan SLA',
                      value: `${p.ontimeRate}%`,
                      picData: p,
                      barType: 'ONTIME',
                    })
                  )}

                  {selectedMetric === 'DURATION' && (
                    /* Mode Pilar Tunggal: Rata-Rata Lead Time Hari Kerja */
                    render3DPillar({
                      x: centerX - 16,
                      y: baseY + 5,
                      width: 32,
                      height: (p.avgDays / maxDays) * maxBarH,
                      colors: {
                        top: p.avgDays <= 10 ? '#c084fc' : '#fb7185',
                        front: p.avgDays <= 10 ? '#a855f7' : '#e11d48',
                        side: p.avgDays <= 10 ? '#7e22ce' : '#9f1239',
                        border: p.avgDays <= 10 ? '#d8b4fe' : '#fda4af',
                        glow: '#a855f7',
                      },
                      label: 'Rata-Rata Hari Proses',
                      value: `${p.avgDays} hr`,
                      picData: p,
                      barType: 'DURATION',
                    })
                  )}

                  {/* IDENTIFIKASI NAMA PERSONIL DI BAWAH PODIUM */}
                  <g
                    transform={`translate(${centerX}, ${podBaseY + 32})`}
                    className="cursor-pointer"
                    onClick={() => onSelectPic?.(p.pic)}
                    onMouseEnter={(e) =>
                      handleBarMouseEnter(e, p, 'TOTAL', 'Ringkasan Seluruh SPP', p.total, '#3b82f6')
                    }
                    onMouseMove={handleBarMouseMove}
                    onMouseLeave={handleBarMouseLeave}
                  >
                    {/* Plat Nama Bawah */}
                    <rect
                      x={-50}
                      y={0}
                      width={100}
                      height={50}
                      rx={8}
                      fill={isSelected ? '#1e293b' : isHovered ? '#1e293b' : '#0f172a'}
                      stroke={isSelected ? '#3b82f6' : isHovered ? '#60a5fa' : '#1e293b'}
                      strokeWidth={isSelected || isHovered ? '1.5' : '1'}
                      className="shadow-md transition-colors"
                    />

                    {/* Nama Personil PIC */}
                    <text
                      x={0}
                      y={18}
                      textAnchor="middle"
                      fill={isSelected ? '#60a5fa' : isHovered ? '#93c5fd' : '#ffffff'}
                      fontSize="12"
                      fontWeight="bold"
                    >
                      {p.pic}
                    </text>

                    {/* Area Badge text */}
                    {p.area && (
                      <text
                        x={0}
                        y={30}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="8"
                        fontFamily="monospace"
                      >
                        {p.area}
                      </text>
                    )}

                    {/* Badge Status Ringkas */}
                    <text
                      x={0}
                      y={43}
                      textAnchor="middle"
                      fill={p.ontimeRate >= 80 ? '#34d399' : '#f87171'}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {p.closed}/{p.total} PO · {p.ontimeRate}%
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>

        {/* ========================================================================= */}
        {/* SISTEM SHOW / HIDE KETERANGAN INFORMASI SAAT KURSOR DIARAHKAN KE PILAR 3D */}
        {/* ========================================================================= */}
        {tooltip && (
          <div
            className="absolute z-50 pointer-events-none transition-all duration-75 animate-in fade-in zoom-in-95"
            style={{
              left: Math.min(Math.max(tooltip.x - 140, 16), (containerRef.current?.clientWidth || 700) - 290),
              top: Math.max(tooltip.y - 195, 12),
            }}
          >
            <div className="w-72 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700/90 shadow-2xl p-3.5 text-xs text-white space-y-2.5">
              {/* Header Tooltip: Nama PIC & Status */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    {tooltip.picData.pic.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-white block">
                      {tooltip.picData.pic}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {tooltip.picData.area ? `PIC ${AREA_METADATA[tooltip.picData.area]?.name || tooltip.picData.area}` : 'Personil PIC Pengadaan SJA'}
                    </span>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    tooltip.picData.tier === 'Sangat Efisien'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : tooltip.picData.tier === 'Perlu Perhatian'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {tooltip.picData.tier}
                </span>
              </div>

              {/* Sorotan Metrik Pilar yang Sedang Disorot Kursor */}
              <div
                className="p-2 rounded-lg border flex items-center justify-between"
                style={{
                  backgroundColor: `${tooltip.barColor}18`,
                  borderColor: tooltip.barColor,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: tooltip.barColor }}
                  />
                  <span className="text-[11px] font-semibold text-slate-200">
                    {tooltip.barLabel}:
                  </span>
                </div>
                <span className="font-mono font-bold text-sm" style={{ color: tooltip.barColor }}>
                  {tooltip.barValue}
                </span>
              </div>

              {/* Rincian Komparasi Ketiga Grafik Bar (Total, Close, Open) */}
              <div className="space-y-1.5 pt-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Komparasi 3 Grafik Bar:
                </span>
                <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
                  {/* Bar 1: Total SPP */}
                  <div
                    className={`p-1.5 rounded-md border ${
                      tooltip.barType === 'TOTAL'
                        ? 'bg-blue-950/80 border-blue-500 ring-1 ring-blue-500'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <span className="text-[9px] uppercase font-sans text-blue-400 block font-semibold">Total</span>
                    <span className="text-xs font-bold text-white">{tooltip.picData.total}</span>
                  </div>

                  {/* Bar 2: PO Close */}
                  <div
                    className={`p-1.5 rounded-md border ${
                      tooltip.barType === 'CLOSED'
                        ? 'bg-emerald-950/80 border-emerald-500 ring-1 ring-emerald-500'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <span className="text-[9px] uppercase font-sans text-emerald-400 block font-semibold">Close</span>
                    <span className="text-xs font-bold text-emerald-400">{tooltip.picData.closed}</span>
                  </div>

                  {/* Bar 3: PO Open */}
                  <div
                    className={`p-1.5 rounded-md border ${
                      tooltip.barType === 'OPEN'
                        ? 'bg-amber-950/80 border-amber-500 ring-1 ring-amber-500'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <span className="text-[9px] uppercase font-sans text-amber-400 block font-semibold">Open</span>
                    <span className="text-xs font-bold text-amber-400">{tooltip.picData.open}</span>
                  </div>
                </div>
              </div>

              {/* Rincian Kinerja SLA & Lead Time */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <div className="truncate">
                    <span className="text-slate-400 block text-[9px]">Kepatuhan SLA:</span>
                    <strong className="text-white font-mono">{tooltip.picData.ontimeRate}% Ontime</strong>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <div className="truncate">
                    <span className="text-slate-400 block text-[9px]">Rata-rata Durasi:</span>
                    <strong className="text-white font-mono">{tooltip.picData.avgDays} Hari</strong>
                  </div>
                </div>
              </div>

              {/* Petunjuk Aksi Klik */}
              <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-blue-400 flex items-center justify-between">
                <span>Klik pilar untuk rincian dokumen</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </div>
        )}

        {/* Petunjuk Interaksi */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span>Arahkan kursor ke pilar grafik untuk melihat pop-up keterangan. Klik pilar untuk membuka rincian dokumen.</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Total {metrics.length} Personil PIC Pengadaan SJA
          </div>
        </div>
      </div>
    </div>
  );
};
