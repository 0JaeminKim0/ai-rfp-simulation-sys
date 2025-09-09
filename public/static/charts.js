// Chart.js 기반 차트 관리자

class ChartManager {
    constructor() {
        this.charts = {};
        this.radarColors = {
            clarity: 'rgba(59, 130, 246, 0.8)',      // 블루
            expertise: 'rgba(34, 197, 94, 0.8)',     // 그린  
            persuasion: 'rgba(147, 51, 234, 0.8)',   // 퍼플
            logic: 'rgba(239, 68, 68, 0.8)',         // 레드
            creativity: 'rgba(245, 158, 11, 0.8)',   // 엠버
            reliability: 'rgba(107, 114, 128, 0.8)'  // 그레이
        };
    }

    // 6각형 레이더 차트 생성 (6대 평가지표용)
    createRadarChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const defaultOptions = {
            type: 'radar',
            data: {
                labels: ['명확성', '전문성', '설득력', '논리성', '창의성', '신뢰성'],
                datasets: [{
                    label: options.label || '평가 점수',
                    data: [
                        data.clarity || 0,
                        data.expertise || 0, 
                        data.persuasion || 0,
                        data.logic || 0,
                        data.creativity || 0,
                        data.reliability || 0
                    ],
                    backgroundColor: 'rgba(255, 107, 26, 0.2)',
                    borderColor: '#ff6b1a',
                    borderWidth: 2,
                    pointBackgroundColor: '#ff6b1a',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#ff6b1a',
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        min: 0,
                        max: 100,
                        ticks: {
                            stepSize: 20,
                            font: {
                                size: 12
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        angleLines: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        pointLabels: {
                            font: {
                                size: 14,
                                weight: '500'
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            font: {
                                size: 13
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.r + '점';
                            }
                        }
                    }
                },
                ...options.chartOptions
            }
        };

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        this.charts[canvasId] = new Chart(ctx, defaultOptions);
        return this.charts[canvasId];
    }

    // 비교용 레이더 차트 (여러 페르소나)
    createComparisonRadarChart(canvasId, datasets, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const colors = ['#ff6b1a', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];
        
        const chartDatasets = datasets.map((dataset, index) => ({
            label: dataset.name,
            data: [
                dataset.data.clarity || 0,
                dataset.data.expertise || 0,
                dataset.data.persuasion || 0,
                dataset.data.logic || 0,
                dataset.data.creativity || 0,
                dataset.data.reliability || 0
            ],
            backgroundColor: colors[index % colors.length] + '20',
            borderColor: colors[index % colors.length],
            borderWidth: 2,
            pointBackgroundColor: colors[index % colors.length],
            pointBorderColor: '#fff',
            pointRadius: 4,
            pointHoverRadius: 6
        }));

        const chartOptions = {
            type: 'radar',
            data: {
                labels: ['명확성', '전문성', '설득력', '논리성', '창의성', '신뢰성'],
                datasets: chartDatasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        min: 0,
                        max: 100,
                        ticks: {
                            stepSize: 20,
                            font: { size: 12 }
                        },
                        grid: { color: 'rgba(0, 0, 0, 0.1)' },
                        angleLines: { color: 'rgba(0, 0, 0, 0.1)' },
                        pointLabels: {
                            font: { size: 14, weight: '500' }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 20, font: { size: 13 } }
                    }
                }
            }
        };

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        this.charts[canvasId] = new Chart(ctx, chartOptions);
        return this.charts[canvasId];
    }

    // 도넛 차트 생성 (회사별 분포 등)
    createDoughnutChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const defaultColors = [
            '#ff6b1a', '#3b82f6', '#10b981', '#8b5cf6', 
            '#f59e0b', '#ef4444', '#06b6d4', '#84cc16'
        ];

        const chartOptions = {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: options.colors || defaultColors.slice(0, data.labels.length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value}명 (${percentage}%)`;
                            }
                        }
                    }
                },
                ...options.chartOptions
            }
        };

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        this.charts[canvasId] = new Chart(ctx, chartOptions);
        return this.charts[canvasId];
    }

    // 바차트 생성 (역량별 평균 점수 등)
    createBarChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const chartOptions = {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: options.label || '평균 점수',
                    data: data.values,
                    backgroundColor: options.backgroundColor || '#ff6b1a',
                    borderColor: options.borderColor || '#e55a15',
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10,
                        ticks: {
                            stepSize: 1
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '점';
                            }
                        }
                    }
                },
                ...options.chartOptions
            }
        };

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        this.charts[canvasId] = new Chart(ctx, chartOptions);
        return this.charts[canvasId];
    }

    // 라인 차트 생성 (시간별 트렌드)
    createLineChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const chartOptions = {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: data.datasets.map((dataset, index) => ({
                    label: dataset.label,
                    data: dataset.data,
                    borderColor: options.colors?.[index] || '#ff6b1a',
                    backgroundColor: (options.colors?.[index] || '#ff6b1a') + '20',
                    borderWidth: 3,
                    fill: options.fill || false,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.1)' }
                    },
                    x: {
                        grid: { color: 'rgba(0, 0, 0, 0.05)' }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { padding: 20, font: { size: 12 } }
                    }
                },
                ...options.chartOptions
            }
        };

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        this.charts[canvasId] = new Chart(ctx, chartOptions);
        return this.charts[canvasId];
    }

    // 차트 업데이트
    updateChart(canvasId, newData) {
        const chart = this.charts[canvasId];
        if (!chart) return;

        if (chart.config.type === 'radar') {
            chart.data.datasets[0].data = [
                newData.clarity || 0,
                newData.expertise || 0,
                newData.persuasion || 0,
                newData.logic || 0,
                newData.creativity || 0,
                newData.reliability || 0
            ];
        } else {
            chart.data = newData;
        }

        chart.update();
    }

    // 차트 제거
    destroyChart(canvasId) {
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
            delete this.charts[canvasId];
        }
    }

    // 모든 차트 제거
    destroyAllCharts() {
        Object.keys(this.charts).forEach(canvasId => {
            this.destroyChart(canvasId);
        });
    }

    // 차트를 이미지로 내보내기
    exportChartAsImage(canvasId, filename = 'chart.png') {
        const chart = this.charts[canvasId];
        if (!chart) return;

        const url = chart.toBase64Image();
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
    }

    // 루브릭 앵커 기반 색상 반환
    getAnchorColor(score) {
        if (score >= 90) return '#10b981';      // 녹색 (90-100점)
        if (score >= 70) return '#3b82f6';     // 파랑 (70-89점)
        if (score >= 50) return '#f59e0b';     // 노랑 (50-69점)
        if (score >= 30) return '#f97316';     // 주황 (30-49점)
        return '#ef4444';                      // 빨강 (0-29점)
    }

    // 애니메이션이 있는 숫자 카운터
    animateNumber(elementId, targetValue, duration = 1000) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const startValue = parseInt(element.textContent) || 0;
        const increment = (targetValue - startValue) / (duration / 16);
        let currentValue = startValue;

        const timer = setInterval(() => {
            currentValue += increment;
            if ((increment > 0 && currentValue >= targetValue) || 
                (increment < 0 && currentValue <= targetValue)) {
                currentValue = targetValue;
                clearInterval(timer);
            }
            element.textContent = Math.round(currentValue);
        }, 16);
    }

    // 레이더 차트용 가짜 데이터 생성 (데모용)
    generateSampleRadarData() {
        return {
            clarity: Math.floor(Math.random() * 41) + 60,      // 60-100
            expertise: Math.floor(Math.random() * 41) + 60,    // 60-100
            persuasion: Math.floor(Math.random() * 41) + 60,   // 60-100
            logic: Math.floor(Math.random() * 41) + 60,        // 60-100
            creativity: Math.floor(Math.random() * 41) + 60,   // 60-100
            reliability: Math.floor(Math.random() * 41) + 60   // 60-100
        };
    }

    // 루브릭 앵커별 점수 분포 차트
    createAnchorDistributionChart(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const chartOptions = {
            type: 'bar',
            data: {
                labels: ['20점\n(부족)', '40점\n(기본)', '60점\n(보통)', '80점\n(우수)', '100점\n(탁월)'],
                datasets: [{
                    label: '점수 분포',
                    data: [
                        data.score_20 || 0,
                        data.score_40 || 0,
                        data.score_60 || 0,
                        data.score_80 || 0,
                        data.score_100 || 0
                    ],
                    backgroundColor: [
                        '#ef4444',    // 20점 - 빨강
                        '#f97316',    // 40점 - 주황
                        '#f59e0b',    // 60점 - 노랑
                        '#3b82f6',    // 80점 - 파랑
                        '#10b981'     // 100점 - 녹색
                    ],
                    borderWidth: 0,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 },
                        grid: { color: 'rgba(0, 0, 0, 0.1)' }
                    },
                    x: {
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.parsed.y}개의 평가`;
                            }
                        }
                    }
                }
            }
        };

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        this.charts[canvasId] = new Chart(ctx, chartOptions);
        return this.charts[canvasId];
    }
}

// 전역 차트 매니저 인스턴스
const chartManager = new ChartManager();