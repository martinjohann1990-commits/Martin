# PV-Überschussladen: SolaX X1/X3-HAC + SolaX Cloud

Kleiner Dienst (nur Python-Standardbibliothek, keine Abhängigkeiten), der die
Ladeleistung der **SolaX X1/X3-HAC** Wallbox dynamisch an den PV-Ertrag des
**X3-MIC/PRO-G2** anpasst.

```
SolaX Cloud API ──(PV, Einspeisung, alle ~5 min)──┐
                                                  ▼
                                   ┌──────────────────────────┐
X1/X3-HAC ◀──Modbus TCP (lokal)───▶│ pvwallbox (Raspberry Pi, │──▶ Web-UI :8080
 Ladestrom 6–16 A, Start/Stop      │  NAS, Docker …)          │    (Modus umschalten)
                                   └──────────────────────────┘
```

## Wie geregelt wird

* **Überschuss** = Einspeisung + aktuelle Ladeleistung des Autos − Reserve
  (also: „Was würde ins Netz gehen, wenn das Auto nicht laden würde?“).
  Ein entladender Hausspeicher wird abgezogen, damit der Akku nicht ins Auto fließt.
* **Ladestrom** = Überschuss / (Phasen × 230 V), abgerundet, begrenzt auf 6–16 A.
* **Start** erst, wenn der Überschuss ≥ 6 A (3-phasig ≈ 4,1 kW) für 5 min stabil ist.
* **Wolken**: bei Defizit wird zunächst mit 6 A weitergeladen; gestoppt wird erst nach
  10 min Defizit (plus mind. 15 min Ladedauer). Kleiner Netzbezug (300 W) wird toleriert.
* **Cloud-Ausfall**: sind die Daten älter als 15 min, wird gestoppt (oder auf 6 A
  gefahren, `stale_action = "min"`).
* Alle Werte sind in `config.toml` einstellbar.

### Modi (über Web-UI oder `POST /api/mode`)

| Modus   | Verhalten                                   |
|---------|---------------------------------------------|
| `pv`    | Nur PV-Überschuss                           |
| `minpv` | Immer mind. 6 A, mehr bei Überschuss        |
| `fast`  | Volle Leistung (max_current_a)              |
| `off`   | Nicht laden                                 |

## Einrichtung

1. **Wechselrichter wieder online bringen.** In der App sind X3-MIC und der
   Pocket LAN 3.0 als *offline* markiert – ohne diese Verbindung liefert die Cloud
   keine Daten und der Dienst lädt im `pv`-Modus nicht.
2. **API-Token holen:** solaxcloud.com → *Service* → *API* → Token kopieren.
   Als `wifi_sn` die Registriernummer des Pocket LAN (z. B. `SYWNGJJMFG`) eintragen.
3. **Wallbox im Heimnetz finden:** IP der HAC im Router nachsehen (feste IP vergeben!).
   Modbus TCP (Port 502) muss aktiv sein; die Modbus-Adresse steht in der SolaX-App
   bei den Wallbox-Einstellungen.
4. **Zähler/CT:** Für `surplus_source = "feedin"` braucht der Wechselrichter einen
   Netzzähler (Einspeisung ≠ 0 in der Cloud). Ohne Zähler `surplus_source = "pv_minus_base"`
   und `base_load_w` auf die typische Grundlast setzen.
5. Konfiguration anlegen und erst im Trockenlauf testen:

```bash
cp config.example.toml config.toml   # anpassen
python3 -m pvwallbox.main --once --dry-run   # ein Durchlauf, zeigt Status als JSON
python3 -m pvwallbox.main --dry-run          # Dauerbetrieb, schaltet nichts
python3 -m pvwallbox.main                    # scharf
```

Web-UI: `http://<ip-des-rechners>:8080`

### Dauerbetrieb

**Raspberry Pi / Linux (systemd):**
```bash
sudo cp -r pv-wallbox /opt/ && sudo cp /opt/pv-wallbox/pvwallbox.service /etc/systemd/system/
sudo systemctl enable --now pvwallbox
journalctl -u pvwallbox -f
```

**Docker:**
```bash
docker build -t pvwallbox .
docker run -d --restart=always --name pvwallbox -p 8080:8080 \
  -v $PWD/config.toml:/data/config.toml pvwallbox
```

## Wichtige Hinweise

* **Verzögerung:** Die SolaX Cloud aktualisiert nur etwa alle 5 Minuten. Das reicht für
  PV-Überschussladen (deshalb die Glättung und Verzögerungen), regelt aber nicht
  sekundengenau. Für schnellere Regelung könnte man später den Wechselrichter lokal per
  Modbus auslesen – die Regel-Logik bleibt gleich.
* **Phasen:** 3-phasig beginnt das Laden erst ab ~4,1 kW Überschuss. Wer das Auto
  1-phasig laden lässt (Einstellung an der Wallbox), setzt `phases = 1` → Start ab ~1,4 kW.
* Der Dienst stellt die Wallbox beim Start eines Ladevorgangs auf den Modus **„Fast“**,
  damit sie dem vorgegebenen Ladestrom folgt. Die eingebauten Modi ECO/Green der
  Wallbox sollten dann nicht parallel genutzt werden.
* Registeradressen der HAC stammen aus dem Community-Projekt
  [homeassistant-solax-modbus](https://github.com/wills106/homeassistant-solax-modbus)
  und sind in `pvwallbox/wallbox.py` dokumentiert.

## Tests

```bash
python3 -m unittest discover -s tests -t .
```
