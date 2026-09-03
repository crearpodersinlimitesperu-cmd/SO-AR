/**
 * CREAR PODER SIN LIMITES - Live Flight Tracker Module
 * Sincronizador automatico de vuelos en tiempo real para cartas y Centro Operativo.
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
                    const res = await fetch(url, { cache: 'no-store' });
                    if (res.ok) {
                        const json = await res.json();
                        if (json && json.flights) {
                            this.data = json;
                            return json.flights[flightCode] || null;
                        }
                    }
                } catch (e) {
                    // Try next URL fallback
                }
            }
            return null;
        },

        calculateProgress(depTimeStr, arrTimeStr) {
            const now = Date.now();
            const dep = new Date(depTimeStr).getTime();
            const arr = new Date(arrTimeStr).getTime();

            if (now < dep) {
                const diffMs = dep - now;
                const hours = Math.floor(diffMs / 3600000);
                const mins = Math.floor((diffMs % 3600000) / 60000);
                return {
                    state: 'PRE_FLIGHT',
                    percent: 0,
                    text: hours > 0 ? ('Despegue en ' + hours + 'h ' + mins + 'm') : ('Despegue en ' + mins + ' min')
                };
            } else if (now >= arr) {
                return {
                    state: 'COMPLETED',
                    percent: 100,
                    text: 'Vuelo completado / Aterrizado'
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
                    text: 'En vuelo (' + pct + '%) · Arribo en ' + remMins + ' min'
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
            } catch (e) {
                return isoStr;
            }
        },

        render(flight) {
            if (!flight) return;
            this.currentFlight = flight;

            const prog = this.calculateProgress(
                flight.schedule.estimatedDeparture || flight.schedule.scheduledDeparture,
                flight.schedule.estimatedArrival || flight.schedule.scheduledArrival
            );

            // Badge element
            const badgeEl = document.getElementById('flight-live-badge');
            if (badgeEl) {
                if (flight.status === 'DELAYED' || flight.delayMinutes > 0) {
                    badgeEl.className = 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold px-2.5 py-1 rounded-full text-[11px] flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse';
                    badgeEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-amber-400"></i> Demorado (+' + flight.delayMinutes + ' min)';
                } else if (prog.state === 'IN_FLIGHT' || flight.status === 'AIRBORNE') {
                    badgeEl.className = 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold px-2.5 py-1 rounded-full text-[11px] flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.3)]';
                    badgeEl.innerHTML = '<i class="fa-solid fa-plane text-cyan-400 animate-pulse"></i> En vuelo · En ruta';
                } else if (prog.state === 'COMPLETED' || flight.status === 'LANDED') {
                    badgeEl.className = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold px-2.5 py-1 rounded-full text-[11px] flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.3)]';
                    badgeEl.innerHTML = '<i class="fa-solid fa-check-circle text-emerald-400"></i> Aterrizado en Lima';
                } else {
                    badgeEl.className = 'bg-green-500/20 text-green-400 border border-green-500/30 font-bold px-2.5 py-1 rounded-full text-[11px] flex items-center gap-1.5';
                    badgeEl.innerHTML = '<i class="fa-solid fa-circle text-[7px] text-green-400 animate-pulse"></i> A tiempo · Directo';
                }
            }

            // Times
            const depEl = document.getElementById('flight-live-dep');
            if (depEl) {
                depEl.textContent = this.formatTime12h(flight.schedule.estimatedDeparture || flight.schedule.scheduledDeparture);
            }
            const arrEl = document.getElementById('flight-live-arr');
            if (arrEl) {
                arrEl.textContent = this.formatTime12h(flight.schedule.estimatedArrival || flight.schedule.scheduledArrival);
                if (flight.delayMinutes > 0) {
                    arrEl.className = 'text-amber-400 text-base font-black';
                } else {
                    arrEl.className = 'text-green-400 text-base font-black';
                }
            }

            // Progress bar
            const barEl = document.getElementById('flight-live-bar');
            if (barEl) {
                barEl.style.width = prog.percent + '%';
                if (flight.delayMinutes > 0) {
                    barEl.className = 'h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-700';
                } else {
                    barEl.className = 'h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 rounded-full transition-all duration-700';
                }
            }

            // Progress label
            const labelEl = document.getElementById('flight-live-label');
            if (labelEl) {
                labelEl.textContent = prog.text;
            }

            // Logistics pickup recalculation
            const pickupEl = document.getElementById('flight-live-pickup');
            if (pickupEl && flight.logistics) {
                pickupEl.textContent = flight.logistics.driverPickupEstimated || '10:35 AM';
            }

            // Last sync timestamp
            const syncEl = document.getElementById('flight-live-sync');
            if (syncEl) {
                const d = new Date();
                const syncTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                syncEl.textContent = 'Actualizado ' + syncTime;
            }
        },

        async init(flightCode = 'LA1437') {
            const flight = await this.fetchStatus(flightCode);
            if (flight) {
                this.render(flight);
            }
            if (this.intervalId) clearInterval(this.intervalId);
            this.intervalId = setInterval(async () => {
                const updated = await this.fetchStatus(flightCode);
                if (updated) this.render(updated);
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
            if (flight) {
                this.render(flight);
            }
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
