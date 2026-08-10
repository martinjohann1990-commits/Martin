Option Explicit

' ===========================================================================
' modStammdaten - DC-Zeilen hinzufuegen und entfernen
'
' Die Berechnungstabelle der Simulation und die Punkttabelle der Karte haben
' je DC genau eine Zeile. Beide werden hier synchron mitgefuehrt.
'
' Wichtig fuer den Erhalt der Formeln: Eine neue Zeile wird stets VOR der
' letzten Zeile eingefuegt. Nur dann erweitert Excel Bereichsbezuege wie
' $Q$20:$Q$25 selbsttaetig auf $Q$20:$Q$26. Anschliessend werden die Formeln
' aus der Zeile darueber kopiert, wodurch die relativen Zeilenbezuege auf
' DC_Stammdaten korrekt weiterzaehlen.
' ===========================================================================

Private Const KARTE_ERSTE_ZEILE As Long = 7
Private Const SIM_LETZTE_SPALTE As String = "U"


Private Function DCTabelle() As ListObject
    Set DCTabelle = ThisWorkbook.Worksheets(BLATT_DC).ListObjects("tblDC")
End Function


' Anzahl der DC-Zeilen in den Stammdaten.
Public Function DC_Anzahl() As Long
    DC_Anzahl = DCTabelle.ListRows.Count
End Function


Sub DC_Hinzufuegen()
    Dim tbl As ListObject
    Dim anzahl As Long, dcZeile As Long, simZeile As Long, karteZeile As Long
    Dim wsSim As Worksheet, wsKarte As Worksheet

    On Error GoTo Fehler
    Application.ScreenUpdating = False

    Set tbl = DCTabelle
    anzahl = tbl.ListRows.Count
    If anzahl < 2 Then
        MsgBox "Die Stammdaten brauchen mindestens zwei Zeilen, damit neue " & _
               "Zeilen mit Formeln versorgt werden koennen.", vbExclamation, _
               "DC hinzufuegen"
        GoTo Ende
    End If

    ' 1) Stammdaten: leere Zeile vor der letzten Tabellenzeile
    tbl.ListRows.Add Position:=anzahl
    dcZeile = tbl.DataBodyRange.Row + anzahl - 1

    ' 2) Simulation: Zeile einfuegen und Formeln von oben uebernehmen
    Set wsSim = ThisWorkbook.Worksheets(BLATT_SIM)
    simZeile = SIM_ERSTE_ZEILE + anzahl - 1
    wsSim.Rows(simZeile).Insert Shift:=xlDown
    wsSim.Rows(simZeile - 1).Copy Destination:=wsSim.Rows(simZeile)

    ' 3) Karte: nur die Spalten A:D der DC-Punkte verschieben
    Set wsKarte = ThisWorkbook.Worksheets(BLATT_KARTE)
    karteZeile = KARTE_ERSTE_ZEILE + anzahl - 1
    wsKarte.Range("A" & karteZeile & ":D" & karteZeile).Insert Shift:=xlDown
    wsKarte.Range("A" & (karteZeile - 1) & ":D" & (karteZeile - 1)).Copy _
        Destination:=wsKarte.Range("A" & karteZeile & ":D" & karteZeile)

    Application.CutCopyMode = False
    ThisWorkbook.Worksheets(BLATT_DC).Activate
    ThisWorkbook.Worksheets(BLATT_DC).Range("A" & dcZeile).Select

    Application.ScreenUpdating = True
    MsgBox "Neue DC-Zeile in Zeile " & dcZeile & " angelegt." & vbCrLf & vbCrLf & _
           "Simulation und Karte wurden mitgefuehrt. Bitte die Stammdaten " & _
           "ausfuellen (Kapazitaet, Koordinaten, Kosten, aktiv = Ja).", _
           vbInformation, "DC hinzufuegen"
    Exit Sub

Fehler:
    MsgBox "Die Zeile konnte nicht angelegt werden: " & Err.Description, _
           vbExclamation, "DC hinzufuegen"
Ende:
    Application.CutCopyMode = False
    Application.ScreenUpdating = True
End Sub


Sub DC_Entfernen()
    Dim tbl As ListObject
    Dim anzahl As Long, index As Long
    Dim dcName As String
    Dim wsDC As Worksheet, wsSim As Worksheet, wsKarte As Worksheet
    Dim simZeile As Long, karteZeile As Long

    On Error GoTo Fehler
    Set wsDC = ThisWorkbook.Worksheets(BLATT_DC)
    Set tbl = DCTabelle
    anzahl = tbl.ListRows.Count

    If anzahl <= 2 Then
        MsgBox "Es muessen mindestens zwei DC-Zeilen erhalten bleiben.", _
               vbExclamation, "DC entfernen"
        Exit Sub
    End If

    index = ZeileAusAuswahl(tbl)
    If index = 0 Then
        MsgBox "Bitte zuerst eine Zelle in der zu loeschenden DC-Zeile " & _
               "markieren.", vbExclamation, "DC entfernen"
        Exit Sub
    End If
    If index = anzahl Then
        MsgBox "Die letzte Tabellenzeile kann nicht entfernt werden, weil sie " & _
               "die Bereichsbezuege der Simulation begrenzt." & vbCrLf & _
               "Bitte stattdessen eine der Zeilen darueber loeschen oder den " & _
               "DC auf aktiv = Nein setzen.", vbExclamation, "DC entfernen"
        Exit Sub
    End If

    dcName = CStr(tbl.DataBodyRange.Cells(index, 1).Value)
    If MsgBox("Soll die DC-Zeile """ & dcName & """ wirklich entfernt werden?" & _
              vbCrLf & "Simulation und Karte werden ebenfalls angepasst.", _
              vbYesNo + vbQuestion, "DC entfernen") <> vbYes Then Exit Sub

    Application.ScreenUpdating = False

    Set wsSim = ThisWorkbook.Worksheets(BLATT_SIM)
    simZeile = SIM_ERSTE_ZEILE + index - 1
    wsSim.Rows(simZeile).Delete Shift:=xlUp

    Set wsKarte = ThisWorkbook.Worksheets(BLATT_KARTE)
    karteZeile = KARTE_ERSTE_ZEILE + index - 1
    wsKarte.Range("A" & karteZeile & ":D" & karteZeile).Delete Shift:=xlUp

    tbl.ListRows(index).Delete

    Application.ScreenUpdating = True
    MsgBox "Die Zeile """ & dcName & """ wurde entfernt.", vbInformation, _
           "DC entfernen"
    Exit Sub

Fehler:
    Application.ScreenUpdating = True
    MsgBox "Die Zeile konnte nicht entfernt werden: " & Err.Description, _
           vbExclamation, "DC entfernen"
End Sub


' Liefert die 1-basierte Position der markierten Zeile innerhalb der Tabelle
' oder 0, wenn die Auswahl ausserhalb liegt.
Private Function ZeileAusAuswahl(tbl As ListObject) As Long
    Dim erste As Long, aktuell As Long

    ZeileAusAuswahl = 0
    If ActiveSheet.Name <> BLATT_DC Then Exit Function
    If Selection Is Nothing Then Exit Function

    erste = tbl.DataBodyRange.Row
    aktuell = ActiveCell.Row
    If aktuell >= erste And aktuell <= erste + tbl.ListRows.Count - 1 Then
        ZeileAusAuswahl = aktuell - erste + 1
    End If
End Function
