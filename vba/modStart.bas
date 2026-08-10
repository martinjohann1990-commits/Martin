Option Explicit

' ===========================================================================
' modStart - Einrichtung der Arbeitsmappe und zentrale Konstanten
'
' Auto_Open laeuft beim Oeffnen der Mappe (mit aktivierten Makros) und legt
' alles an, was sich nicht in der Datei speichern laesst bzw. vom aktuellen
' Stand der Stammdaten abhaengt: Navigations- und Aktions-Schaltflaechen,
' Sparklines der KPI-Kacheln und ausgeblendete Gitternetzlinien.
' ===========================================================================

' Farbschema (identisch zu tools/design.py)
Public Const C_DUNKELBLAU As Long = &H64381F   ' RGB(31, 56, 100)
Public Const C_BLAU As Long = &HB6752E         ' RGB(46, 117, 182)
Public Const C_AKZENT As Long = &H317DED       ' RGB(237, 125, 49)
Public Const C_HELLBLAU As Long = &HF7EBDE     ' RGB(222, 235, 247)

Public Const BLATT_START As String = "Dashboard"
Public Const BLATT_DC As String = "DC_Stammdaten"
Public Const BLATT_HIST As String = "Import_Historie"
Public Const BLATT_FC As String = "Import_Forecast"
Public Const BLATT_MAPPING As String = "Import_Mapping"
Public Const BLATT_ZR As String = "Zielreichweite"
Public Const BLATT_SIM As String = "Simulation"
Public Const BLATT_SZ As String = "Szenarien"
Public Const BLATT_KARTE As String = "Karte"
Public Const BLATT_BSP As String = "Beispieldaten"

' Feste Positionen (muessen zu build_workbook.py passen)
Public Const DC_ERSTE_ZEILE As Long = 6
Public Const SIM_ERSTE_ZEILE As Long = 20
Public Const SZ_ERSTE_ZEILE As Long = 7
Public Const SZ_SPALTEN_META As Long = 13   ' Spalten A..M der Szenariotabelle


Sub Auto_Open()
    Setup_Arbeitsmappe
End Sub


' Legt Schaltflaechen, Sparklines und Blattoptik neu an. Kann jederzeit
' erneut aufgerufen werden (alles wird vorher entfernt).
Sub Setup_Arbeitsmappe()
    Dim ws As Worksheet
    Dim frueher As Boolean

    frueher = Application.ScreenUpdating
    Application.ScreenUpdating = False
    On Error GoTo Fehler

    For Each ws In ThisWorkbook.Worksheets
        SchaltflaechenEntfernen ws
        ws.Activate
        ActiveWindow.DisplayGridlines = False
    Next ws

    NavigationAufbauen
    AktionsButtons
    SparklinesAufbauen

    ThisWorkbook.Worksheets(BLATT_START).Activate
    ActiveWindow.ScrollRow = 1
    Application.ScreenUpdating = frueher
    Exit Sub

Fehler:
    Application.ScreenUpdating = frueher
    MsgBox "Die Einrichtung wurde abgebrochen: " & Err.Description, vbExclamation, _
           "Logistik-Netzwerkplanung"
End Sub


Private Sub SchaltflaechenEntfernen(ws As Worksheet)
    Dim shp As Shape
    Dim i As Long

    For i = ws.Shapes.Count To 1 Step -1
        Set shp = ws.Shapes(i)
        If shp.Type = msoFormControl Then
            If shp.Name Like "btn*" Then shp.Delete
        End If
    Next i
End Sub


' Erzeugt eine Schaltflaeche (Formular-Steuerelement) an einer Zellposition.
Private Function Button(ws As Worksheet, name As String, beschriftung As String, _
                        makro As String, links As Double, oben As Double, _
                        Optional breite As Double = 108, _
                        Optional hoehe As Double = 26) As Shape
    Dim b As Shape

    Set b = ws.Buttons.Add(links, oben, breite, hoehe).ShapeRange.Item(1)
    b.Name = name
    b.OLEFormat.Object.Caption = beschriftung
    b.OLEFormat.Object.OnAction = makro
    With b.TextFrame.Characters.Font
        .Name = "Arial"
        .Size = 9
    End With
    Set Button = b
End Function


' Navigationsleiste: auf dem Dashboard alle Blaetter, auf allen anderen
' Blaettern eine Ruecksprung-Schaltflaeche.
Private Sub NavigationAufbauen()
    Dim ws As Worksheet, start As Worksheet
    Dim ziele As Variant, i As Long
    Dim links As Double

    Set start = ThisWorkbook.Worksheets(BLATT_START)
    ziele = Array(BLATT_DC, BLATT_HIST, BLATT_FC, BLATT_MAPPING, BLATT_ZR, _
                  BLATT_SIM, BLATT_SZ, BLATT_KARTE, BLATT_BSP)

    links = start.Range("B5").Left
    For i = LBound(ziele) To UBound(ziele)
        Button start, "btnNav" & i, CStr(ziele(i)), "'GeheZu """ & ziele(i) & """'", _
               links, start.Range("B5").Top, 96, 24
        links = links + 100
    Next i

    For Each ws In ThisWorkbook.Worksheets
        If ws.Name <> BLATT_START Then
            Button ws, "btnZurueck", "<< Start", "'GeheZu """ & BLATT_START & """'", _
                   ws.Range("A1").Left + 4, ws.Range("A1").Top + 2, 70, 20
        End If
    Next ws
End Sub


' Fachliche Schaltflaechen auf den einzelnen Blaettern.
Private Sub AktionsButtons()
    Dim ws As Worksheet

    Set ws = ThisWorkbook.Worksheets(BLATT_DC)
    Button ws, "btnDCAdd", "DC hinzufuegen", "DC_Hinzufuegen", _
           ws.Range("F3").Left, ws.Range("F3").Top, 110, 24
    Button ws, "btnDCDel", "DC entfernen", "DC_Entfernen", _
           ws.Range("F3").Left + 116, ws.Range("F3").Top, 110, 24

    Set ws = ThisWorkbook.Worksheets(BLATT_HIST)
    Button ws, "btnImpHist", "Datei importieren", "Import_Historie_Datei", _
           ws.Range("K4").Left, ws.Range("K4").Top, 120, 24
    Button ws, "btnRefHist", "Nur aktualisieren", "Import_Historie_Aktualisieren", _
           ws.Range("K4").Left + 126, ws.Range("K4").Top, 120, 24

    Set ws = ThisWorkbook.Worksheets(BLATT_FC)
    Button ws, "btnImpFc", "Datei importieren", "Import_Forecast_Datei", _
           ws.Range("K4").Left, ws.Range("K4").Top, 120, 24
    Button ws, "btnRefFc", "Nur aktualisieren", "Import_Forecast_Aktualisieren", _
           ws.Range("K4").Left + 126, ws.Range("K4").Top, 120, 24

    Set ws = ThisWorkbook.Worksheets(BLATT_SIM)
    Button ws, "btnGewNorm", "Gewichte auf 100 %", "Gewichte_Normieren", _
           ws.Range("C10").Left, ws.Range("C10").Top, 130, 24
    Button ws, "btnModus", "Modus umschalten", "Modus_Umschalten", _
           ws.Range("C10").Left + 136, ws.Range("C10").Top, 130, 24
    Button ws, "btnSzSpeichern", "Szenario speichern", "Szenario_Speichern", _
           ws.Range("C15").Left, ws.Range("C15").Top, 130, 24
    Button ws, "btnExpSim", "Export Simulation", "Export_Simulation", _
           ws.Range("C15").Left + 136, ws.Range("C15").Top, 130, 24

    Set ws = ThisWorkbook.Worksheets(BLATT_SZ)
    Button ws, "btnSzSpeichern2", "Szenario speichern", "Szenario_Speichern", _
           ws.Range("A3").Left + 80, ws.Range("A3").Top, 130, 24
    Button ws, "btnSzLeeren", "Szenarien loeschen", "Szenarien_Leeren", _
           ws.Range("A3").Left + 216, ws.Range("A3").Top, 130, 24
    Button ws, "btnExpSz", "Export Vergleich", "Export_Szenarien", _
           ws.Range("A3").Left + 352, ws.Range("A3").Top, 130, 24

    Set ws = ThisWorkbook.Worksheets(BLATT_KARTE)
    Button ws, "btnKarte", "Karte aktualisieren", "Karte_Aktualisieren", _
           ws.Range("K3").Left, ws.Range("K3").Top, 130, 24

    Set ws = ThisWorkbook.Worksheets(BLATT_BSP)
    Button ws, "btnCsvHist", "Beispiel-CSV Historie", "Beispieldaten_CSV_Historie", _
           ws.Range("S5").Left, ws.Range("S5").Top, 150, 24
    Button ws, "btnCsvFc", "Beispiel-CSV Forecast", "Beispieldaten_CSV_Forecast", _
           ws.Range("S5").Left, ws.Range("S5").Top + 30, 150, 24
End Sub


' Sparklines der KPI-Kacheln. Die Datenreihen stehen auf dem Dashboard
' unterhalb der Diagramme (Monatsraster).
Private Sub SparklinesAufbauen()
    Dim ws As Worksheet
    Dim kacheln As Variant, quellen As Variant
    Dim i As Long
    Dim ziel As Range

    Set ws = ThisWorkbook.Worksheets(BLATT_START)
    ' Zelle der Sparkline je Kachel und zugehoerige Datenspalte
    kacheln = Array("B9", "F9", "J9", "B13", "F13", "J13")
    quellen = Array("F", "C", "D", "E", "E", "C")

    For i = LBound(kacheln) To UBound(kacheln)
        Set ziel = ws.Range(CStr(kacheln(i)))
        On Error Resume Next
        ziel.SparklineGroups.Clear
        On Error GoTo 0
        ziel.SparklineGroups.Add Type:=xlSparkLine, _
            SourceData:=ws.Name & "!" & quellen(i) & "51:" & quellen(i) & "62"
        With ziel.SparklineGroups(1)
            .SeriesColor.Color = C_BLAU
            .Points.Highest.Visible = True
            .Points.Highest.Color.Color = C_AKZENT
        End With
    Next i
End Sub
