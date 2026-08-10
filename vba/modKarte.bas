Option Explicit

' ===========================================================================
' modKarte - Blasendiagramm als Karten-Naeherung
'
' Excel kennt kein frei belegbares interaktives Kartenobjekt. Das Blasen-
' diagramm (Longitude = X, Latitude = Y) ist die Naeherung; zusaetzlich wird
' hier das Beschriften der Punkte aus Zellwerten uebernommen, was sich von
' Hand nur muehsam einstellen laesst.
' ===========================================================================

Private Const KARTE_ERSTE_ZEILE As Long = 7


Sub Karte_Aktualisieren()
    Dim ws As Worksheet
    Dim co As ChartObject
    Dim letzteDC As Long, letzteRegion As Long

    On Error GoTo Fehler
    Set ws = ThisWorkbook.Worksheets(BLATT_KARTE)
    If ws.ChartObjects.Count = 0 Then
        MsgBox "Auf dem Blatt Karte ist kein Diagramm vorhanden.", vbExclamation, _
               "Karte"
        Exit Sub
    End If

    letzteDC = KARTE_ERSTE_ZEILE + DC_Anzahl() - 1
    letzteRegion = ws.Cells(ws.Rows.Count, "F").End(xlUp).Row

    Application.ScreenUpdating = False
    Set co = ws.ChartObjects(1)

    With co.Chart
        .SeriesCollection(1).XValues = ws.Range("B" & KARTE_ERSTE_ZEILE & ":B" & letzteDC)
        .SeriesCollection(1).Values = ws.Range("C" & KARTE_ERSTE_ZEILE & ":C" & letzteDC)
        .SeriesCollection(1).BubbleSizes = "=" & ws.Name & "!" & _
            ws.Range("D" & KARTE_ERSTE_ZEILE & ":D" & letzteDC).Address(True, True)
        .SeriesCollection(2).XValues = ws.Range("G" & KARTE_ERSTE_ZEILE & ":G" & letzteRegion)
        .SeriesCollection(2).Values = ws.Range("H" & KARTE_ERSTE_ZEILE & ":H" & letzteRegion)
        .SeriesCollection(2).BubbleSizes = "=" & ws.Name & "!" & _
            ws.Range("I" & KARTE_ERSTE_ZEILE & ":I" & letzteRegion).Address(True, True)
    End With

    ' Punkte mit den Namen aus Spalte A bzw. F beschriften
    BeschriftungAusZellen co.Chart, 1, ws.Range("A" & KARTE_ERSTE_ZEILE & ":A" & letzteDC)
    BeschriftungAusZellen co.Chart, 2, ws.Range("F" & KARTE_ERSTE_ZEILE & ":F" & letzteRegion)

    Application.ScreenUpdating = True
    MsgBox "Karte aktualisiert: " & DC_Anzahl() & " Distributionszentren und " & _
           (letzteRegion - KARTE_ERSTE_ZEILE + 1) & " Absatzregionen.", _
           vbInformation, "Karte"
    Exit Sub

Fehler:
    Application.ScreenUpdating = True
    MsgBox "Die Karte konnte nicht aktualisiert werden: " & Err.Description, _
           vbExclamation, "Karte"
End Sub


' Setzt Datenbeschriftungen je Punkt auf den Text der zugehoerigen Zelle.
Private Sub BeschriftungAusZellen(ch As Chart, serie As Long, namen As Range)
    Dim i As Long
    Dim punkte As Long

    On Error Resume Next
    ch.SeriesCollection(serie).HasDataLabels = True
    punkte = ch.SeriesCollection(serie).Points.Count

    For i = 1 To punkte
        If i <= namen.Cells.Count Then
            With ch.SeriesCollection(serie).Points(i).DataLabel
                .ShowSeriesName = False
                .ShowCategoryName = False
                .ShowValue = False
                .Text = CStr(namen.Cells(i, 1).Value)
                .Position = xlLabelPositionAbove
                .Font.Name = "Arial"
                .Font.Size = 8
            End With
        End If
    Next i
    On Error GoTo 0
End Sub


' Hinweis zu den Zusatzoptionen von Excel (Kartendiagramm / 3D-Karte).
Sub Karte_Hinweis_Kartendiagramm()
    MsgBox "Zusatzoptionen fuer echte Karten in Excel:" & vbCrLf & vbCrLf & _
           "1) Kartendiagramm (Excel 2019/365): Bereich Region + Bedarf auf " & _
           "dem Blatt Karte markieren, dann Einfuegen > Karten > " & _
           "Kartendiagramm. Benoetigt eine Internetverbindung, weil die " & _
           "Geokodierung online erfolgt." & vbCrLf & vbCrLf & _
           "2) 3D-Karte (Power Map): Einfuegen > 3D-Karte > 3D-Karte oeffnen. " & _
           "Dort Latitude und Longitude als Ort und die Kapazitaet als Hoehe " & _
           "zuordnen." & vbCrLf & vbCrLf & _
           "Beides ist bewusst nicht automatisiert, damit die Mappe ohne " & _
           "Internetverbindung und ohne Zusatzkomponenten funktioniert.", _
           vbInformation, "Karte"
End Sub
