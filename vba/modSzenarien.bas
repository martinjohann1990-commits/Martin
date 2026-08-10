Option Explicit

' ===========================================================================
' modSzenarien - Snapshots der Simulation speichern und vergleichen
'
' Gespeichert werden ausschliesslich Werte (keine Formeln), damit ein Szenario
' unveraendert bleibt, wenn anschliessend Eingaben oder Importdaten wechseln.
' ===========================================================================


Sub Szenario_Speichern()
    Dim wsSz As Worksheet, wsSim As Worksheet
    Dim zeile As Long, anzahlDC As Long, i As Long
    Dim name As Variant
    Dim spalteScore As Long, spalteAnteil As Long

    On Error GoTo Fehler
    Set wsSz = ThisWorkbook.Worksheets(BLATT_SZ)
    Set wsSim = ThisWorkbook.Worksheets(BLATT_SIM)

    name = Application.InputBox( _
        Prompt:="Name des Szenarios:", Title:="Szenario speichern", _
        Default:="Szenario " & (NaechsteZeile(wsSz) - SZ_ERSTE_ZEILE + 1), Type:=2)
    If VarType(name) = vbBoolean Then Exit Sub      ' Abbruch
    If Len(Trim$(CStr(name))) = 0 Then Exit Sub

    anzahlDC = DC_Anzahl()
    SpaltenkoepfeSchreiben wsSz, wsSim, anzahlDC
    zeile = NaechsteZeile(wsSz)

    If zeile > 100000 Then
        MsgBox "Die Szenariotabelle ist voll.", vbExclamation, "Szenario speichern"
        Exit Sub
    End If

    Application.ScreenUpdating = False

    ' --- Metadaten und Eingaben (Spalten A..M) ---
    wsSz.Cells(zeile, 1).Value = CStr(name)
    wsSz.Cells(zeile, 2).Value = Now
    wsSz.Cells(zeile, 2).NumberFormat = "DD.MM.YYYY HH:MM"
    wsSz.Cells(zeile, 3).Value = wsSim.Range("B4").Value
    wsSz.Cells(zeile, 4).Value = wsSim.Range("B5").Value
    wsSz.Cells(zeile, 5).Value = wsSim.Range("B10").Value
    wsSz.Cells(zeile, 6).Value = wsSim.Range("B11").Value
    wsSz.Cells(zeile, 7).Value = wsSim.Range("B12").Value
    wsSz.Cells(zeile, 8).Value = wsSim.Range("B15").Value
    wsSz.Cells(zeile, 9).Value = wsSim.Range("B6").Value
    wsSz.Cells(zeile, 10).Value = wsSim.Range("B7").Value
    wsSz.Cells(zeile, 11).Value = wsSim.Range("B8").Value

    ' Empfehlung und bester Score stehen in der Hilfszeile "Rang 1"; sie wird
    ' gesucht, damit eingefuegte oder geloeschte DC-Zeilen nichts verschieben.
    wsSz.Cells(zeile, 12).Value = RangWert(wsSim, "B")
    wsSz.Cells(zeile, 13).Value = RangWert(wsSim, "D")

    wsSz.Range(wsSz.Cells(zeile, 5), wsSz.Cells(zeile, 7)).NumberFormat = "0.0%"
    wsSz.Cells(zeile, 13).NumberFormat = "0.000"

    ' --- Ergebnis je DC (Score, dann Anteil) ---
    spalteScore = SZ_SPALTEN_META + 1
    spalteAnteil = SZ_SPALTEN_META + 1 + anzahlDC
    For i = 0 To anzahlDC - 1
        wsSz.Cells(zeile, spalteScore + i).Value = _
            WertOderLeer(wsSim.Range("P" & (SIM_ERSTE_ZEILE + i)))
        wsSz.Cells(zeile, spalteScore + i).NumberFormat = "0.000"
        wsSz.Cells(zeile, spalteAnteil + i).Value = _
            WertOderLeer(wsSim.Range("T" & (SIM_ERSTE_ZEILE + i)))
        wsSz.Cells(zeile, spalteAnteil + i).NumberFormat = "0.0%"
    Next i

    With wsSz.Range(wsSz.Cells(zeile, 1), wsSz.Cells(zeile, spalteAnteil + anzahlDC - 1))
        .Font.Name = "Arial"
        .Font.Size = 10
        .Borders.LineStyle = xlContinuous
        .Borders.Color = RGB(191, 191, 191)
    End With

    DiagrammAktualisieren wsSz, anzahlDC, zeile

    Application.ScreenUpdating = True
    wsSz.Activate
    wsSz.Cells(zeile, 1).Select
    MsgBox "Szenario """ & name & """ in Zeile " & zeile & " gespeichert.", _
           vbInformation, "Szenario speichern"
    Exit Sub

Fehler:
    Application.ScreenUpdating = True
    MsgBox "Das Szenario konnte nicht gespeichert werden: " & Err.Description, _
           vbExclamation, "Szenario speichern"
End Sub


' Liest Empfehlung (Spalte B) bzw. Score (Spalte D) aus der Hilfszeile "Rang 1".
Private Function RangWert(wsSim As Worksheet, spalte As String) As Variant
    Dim zeile As Long

    zeile = RangZeileSuchen(wsSim)
    If zeile = 0 Then
        RangWert = ""
    Else
        RangWert = WertOderLeer(wsSim.Range(spalte & zeile))
    End If
End Function


' Sucht die Zeile mit der Beschriftung "Rang 1" in Spalte A des Blatts.
Private Function RangZeileSuchen(wsSim As Worksheet) As Long
    Dim treffer As Range

    Set treffer = wsSim.Columns("A").Find(What:="Rang 1", LookIn:=xlValues, _
                                          LookAt:=xlWhole, MatchCase:=False)
    If treffer Is Nothing Then
        RangZeileSuchen = 0
    Else
        RangZeileSuchen = treffer.Row
    End If
End Function


Private Function WertOderLeer(zelle As Range) As Variant
    If IsError(zelle.Value) Then
        WertOderLeer = ""
    Else
        WertOderLeer = zelle.Value
    End If
End Function


Private Function NaechsteZeile(wsSz As Worksheet) As Long
    Dim letzte As Long

    letzte = wsSz.Cells(wsSz.Rows.Count, 1).End(xlUp).Row
    If letzte < SZ_ERSTE_ZEILE Then
        NaechsteZeile = SZ_ERSTE_ZEILE
    Else
        NaechsteZeile = letzte + 1
    End If
End Function


' Beschriftet die Score- und Anteilsspalten mit den aktuellen DC-Namen.
Private Sub SpaltenkoepfeSchreiben(wsSz As Worksheet, wsSim As Worksheet, _
                                   anzahlDC As Long)
    Dim i As Long, spalte As Long
    Dim dcName As String
    Dim geaendert As Boolean

    For i = 0 To anzahlDC - 1
        dcName = CStr(WertOderLeer(wsSim.Range("A" & (SIM_ERSTE_ZEILE + i))))
        If Len(dcName) = 0 Then dcName = "DC " & (i + 1)

        spalte = SZ_SPALTEN_META + 1 + i
        If wsSz.Cells(6, spalte).Value <> "Score " & dcName Then geaendert = True
        wsSz.Cells(6, spalte).Value = "Score " & dcName

        spalte = SZ_SPALTEN_META + 1 + anzahlDC + i
        wsSz.Cells(6, spalte).Value = "Anteil " & dcName
    Next i

    If geaendert And wsSz.Cells(SZ_ERSTE_ZEILE, 1).Value <> "" Then
        MsgBox "Hinweis: Die DC-Liste hat sich seit dem letzten Szenario " & _
               "geaendert. Aeltere Zeilen beziehen sich daher auf eine andere " & _
               "DC-Zusammensetzung.", vbInformation, "Szenario speichern"
    End If
End Sub


' Zieht die Datenquelle des Vergleichsdiagramms auf die belegten Zeilen.
Private Sub DiagrammAktualisieren(wsSz As Worksheet, anzahlDC As Long, _
                                  letzteZeile As Long)
    Dim co As ChartObject
    Dim erste As Long, letzte As Long

    If wsSz.ChartObjects.Count = 0 Then Exit Sub
    Set co = wsSz.ChartObjects(1)

    erste = SZ_SPALTEN_META + 1
    letzte = SZ_SPALTEN_META + anzahlDC

    On Error Resume Next
    co.Chart.SetSourceData Source:=wsSz.Range( _
        wsSz.Cells(6, erste), wsSz.Cells(letzteZeile, letzte)), PlotBy:=xlColumns
    co.Chart.SeriesCollection(1).XValues = wsSz.Range( _
        wsSz.Cells(SZ_ERSTE_ZEILE, 1), wsSz.Cells(letzteZeile, 1))
    On Error GoTo 0
End Sub


Sub Szenarien_Leeren()
    Dim wsSz As Worksheet
    Dim letzte As Long

    Set wsSz = ThisWorkbook.Worksheets(BLATT_SZ)
    letzte = wsSz.Cells(wsSz.Rows.Count, 1).End(xlUp).Row

    If letzte < SZ_ERSTE_ZEILE Then
        MsgBox "Es sind keine Szenarien gespeichert.", vbInformation, "Szenarien"
        Exit Sub
    End If

    If MsgBox("Sollen alle " & (letzte - SZ_ERSTE_ZEILE + 1) & " gespeicherten " & _
              "Szenarien geloescht werden?", vbYesNo + vbQuestion, _
              "Szenarien loeschen") <> vbYes Then Exit Sub

    wsSz.Range(wsSz.Rows(SZ_ERSTE_ZEILE), wsSz.Rows(letzte)).ClearContents
    MsgBox "Alle Szenarien wurden geloescht.", vbInformation, "Szenarien"
End Sub
