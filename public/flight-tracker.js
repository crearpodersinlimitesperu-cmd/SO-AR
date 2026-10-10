/**
 * CREAR PODER SIN LIMITES - Itinerarios sincronizados desde Drive.
 * No integra observaciones de estado real de aerolineas.
 */

(function() {
    window.FlightTracker = {
        data: null,
        currentFlight: null,
        intervalId: null,

        async fetchStatus(flightCode) {
            const urls = [
                'vuelos_tracker.json?_t=' + Date.now(),
                '../vuelos_tracker.json?_t=' + Date.now(),
                'https://cartas.crearpsl.net/vuelos_tracker.json?_t=' + Date.now(),
                'https://centro-operativo-cpsl.web.app/vuelos_tracker.json?_t=' + Date.now()
            ];

            for (const url of urls) {
                try {
                    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
                    if (res.ok) {
                        const json = await res.json();
                        if (json && json.flights) {
                            this.data = json;
                            return json.flights[flightCode] || null;
                        }
                    }
                } catch {
                    // Try next URL fallback
                }
            }
            this.data = null;
            return null;
        },

        calculateProgress(depTimeStr, arrTimeStr) {
            const now = Date.now();
            const dep = typeof depTimeStr === 'string' ? Date.parse(depTimeStr) : NaN;
            const arr = typeof arrTimeStr === 'string' ? Date.parse(arrTimeStr) : NaN;

            if (!Number.isFinite(dep) || !Number.isFinite(arr) || arr <= dep) {
                return { state: 'UNKNOWN', percent: 0, text: 'Horario no disponible' };
            }
            if (now < dep) {
                const diffMs = dep - now;
                const hours = Math.floor(diffMs / 3600000);
                const mins = Math.floor((diffMs % 3600000) / 60000);
                return {
                    state: 'PRE_FLIGHT',
                    percent: 0,
                    text: hours > 0 ? ('Salida programada en ' + hours + 'h ' + mins + 'm') : ('Salida programada en ' + mins + ' min')
                };
            } else if (now >= arr) {
                return {
                    state: 'COMPLETED',
                    percent: 100,
                    text: 'Horario de llegada programado pasado (no confirma aterrizaje)'
                };
            } else {
                const total = arr - dep;
                const current = now - dep;
                const pct = Math.min(99, Math.max(1, Math.round((current / total) * 100)));
                const remMs = arr - now;
                const remMins = Math.floor(remMs / 60000);
                return {
                    state: 'IN_FLIGHT',
                    percent: pct,
                    text: 'En horario estimado (' + pct + '%) · Llegada programada en ' + remMins + ' min'
                };
            }
        },

        formatTime12h(isoStr) {
            if (!isoStr) return '';
            try {
                const d = new Date(isoStr);
                let hours = d.getHours();
                const minutes = d.getMinutes().toString().padStart(2, '0');
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours ? hours : 12;
                return hours.toString().padStart(2, '0') + ':' + minutes + ' ' + ampm;
            } catch {
                return isoStr;
            }
        },

        render(flight) {
            this.currentFlight = flight;

            if (!flight) {
                const badge = document.getElementById('flight-live-badge');
                if (badge) {
                    badge.className = 'text-amber-300';
                    badge.setAttribute('role', 'alert');
                    badge.textContent = 'Itinerario no disponible; reintentar';
                }
                const label = document.getElementById('flight-live-label');
                if (label) label.textContent = 'Estado real del vuelo no disponible; consultar aerolínea/radar externo';
                const sync = document.getElementById('flight-live-sync');
                if (sync) sync.textContent = 'No se pudo cargar la sincronización desde Drive';
                const bar = document.getElementById('flight-live-bar');
                if (bar) bar.style.width = '0%';
                return;
            }
            const prog = this.calculateProgress(
                flight.schedule?.scheduledDeparture,
                flight.schedule?.scheduledArrival
            );

            // Badge element
            const badgeEl = document.getElementById('flight-live-badge');
            if (badgeEl) {
                badgeEl.className = 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold px-2.5 py-1 rounded-full text-[11px]';
                badgeEl.setAttribute('role', 'status');
                badgeEl.textContent = prog.state === 'IN_FLIGHT' ? 'En horario estimado' : 'Programado según itinerario';
            }

            // Times
            const depEl = document.getElementById('flight-live-dep');
            if (depEl) {
                depEl.textContent = this.formatTime12h(flight.schedule?.scheduledDeparture);
            }
            const arrEl = document.getElementById('flight-live-arr');
            if (arrEl) {
                arrEl.textContent = this.formatTime12h(flight.schedule?.scheduledArrival);
                arrEl.className = 'text-cyan-300 text-base font-black';
            }

            // Progress bar
            const barEl = document.getElementById('flight-live-bar');
            if (barEl) {
                barEl.style.width = prog.percent + '%';
                barEl.className = 'h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 rounded-full transition-all duration-700';
            }

            // Progress label
            const labelEl = document.getElementById('flight-live-label');
            if (labelEl) {
                labelEl.textContent = prog.text + ' · Estado real del vuelo no disponible; consultar aerolínea/radar externo';
            }

            // Logistics pickup recalculation
            const pickupEl = document.getElementById('flight-live-pickup');
            if (pickupEl && flight.logistics) {
                pickupEl.textContent = flight.logistics.driverPickupEstimated || 'Horario de recojo no disponible';
            }

            // Last sync timestamp
            const syncEl = document.getElementById('flight-live-sync');
            if (syncEl) {
                const d = new Date(this.data?.updatedAt);
                syncEl.textContent = 'Itinerarios sincronizados desde Drive · ' +
                    (Number.isFinite(d.getTime()) ? d.toLocaleString() : 'Fecha no disponible');
            }
        },

        async init(flightCode = 'LA1437') {
            const flight = await this.fetchStatus(flightCode);
            this.render(flight);
            if (this.intervalId) clearInterval(this.intervalId);
            this.intervalId = setInterval(async () => {
                const updated = await this.fetchStatus(flightCode);
                this.render(updated);
            }, 60000);
        },

        async refresh(flightCode = 'LA1437') {
            const btn = document.getElementById('btn-refresh-flight');
            if (btn) {
                const icon = btn.querySelector('i');
                if (icon) icon.classList.add('fa-spin');
                btn.disabled = true;
            }
            const flight = await this.fetchStatus(flightCode);
            this.render(flight);
            setTimeout(() => {
                if (btn) {
                    const icon = btn.querySelector('i');
                    if (icon) icon.classList.remove('fa-spin');
                    btn.disabled = false;
                }
            }, 600);
        }
    };
})();
