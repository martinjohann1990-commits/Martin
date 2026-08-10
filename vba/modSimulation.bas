Option Explicit

' ===========================================================================
' modSimulation - Hilfsmakros fuer das Blatt Simulation
' ===========================================================================


' Skaliert die drei Gewichtungen so, dass ihre Summe genau 100 % ergibt.
Sub Gewichte_Normieren()
    Dim ws As Worksheet
    Dim summe As Double
    Dim i As Long

    Set ws = ThisWorkbook.Worksheets(BLATT_SIM)
    summe = 0
    For i = 10 To 12
        summe = summe + Val(Nz(ws.Range("B" & i).Value))
    Next i

    If summe <= 0 Then
        ws.Range("B10").Value = 1 / 3
        ws.Range("B11").Value = 1 / 3
        ws.Range("B12").Value = 1 - 2 / 3
        MsgBox "Alle Gewichtungen waren leer oder 0 - sie wurden gleichmaessig " & _
               "auf je ein Drittel gesetzt.", vbInformation, "Gewichtung"
        Exit Sub
    End If

    ' Die letzte Gewichtung nimmt den Rundungsrest auf, damit exakt 100 % stehen.
    ws.Range("B10").Value = Round(ws.Range("B10").Value / summe, 4)
    ws.Range("B11").Value = Round(ws.Range("B11").Value / summe, 4)
    ws.Range("B12").Value = 1 - ws.Range("B10").Value - ws.Range("B11").Value

    MsgBox "Die Gewichtungen wurden auf 100 % normiert.", vbInformation, "Gewichtung"
End Sub


' Wechselt zwischen Alleinzuordnung und Splitting.
Sub Modus_Umschalten()
    Dim ws As Worksheet
    Dim zelle As Range

    Set ws = ThisWorkbook.Worksheets(BLATT_SIM)
    Set zelle = ws.Range("B15")

    If zelle.Value = "Alleinzuordnung" Then
        zelle.Value = "Splitting auf mehrere DCs"
    Else
        zelle.Value = "Alleinzuordnung"
    End If

    ws.Activate
    MsgBox "Zuordnungsmodus: " & zelle.Value, vbInformation, "Simulation"
End Sub


' Prueft die Eingaben und meldet die haeufigsten Stolpersteine.
Sub Simulation_Pruefen()
    Dim ws As Worksheet
    Dim meldung As String

    Set ws = ThisWorkbook.Worksheets(BLATT_SIM)

    If Round(Val(Nz(ws.Range("B13").Value)), 4) <> 1 Then
        meldung = meldung & "- Die Summe der Gewichtungen ergibt nicht 100 %." & vbCrLf
    End If
    If Val(Nz(ws.Range("B8").Value)) <= 0 Then
        meldung = meldung & "- Der Ziel-Bestand der gewaehlten Kategorie ist 0. " & _
                  "Bitte Zielreichweite und Importdaten pruefen." & vbCrLf
    End If
    If Val(Nz(ws.Range("I15").Value)) <= 0 Then
        meldung = meldung & "- Fuer die gewaehlte Kategorie liegt kein Bedarf je " & _
                  "Region vor; die Distanzen beziehen sich dann auf den " & _
                  "Nullpunkt." & vbCrLf
    End If

    If Len(meldung) = 0 Then
        MsgBox "Die Eingaben der Simulation sind plausibel.", vbInformation, "Pruefung"
    Else
        MsgBox "Bitte pruefen:" & vbCrLf & vbCrLf & meldung, vbExclamation, "Pruefung"
    End If
End Sub


' Wandelt Empty/Error in 0 bzw. Text um, damit Val() nicht scheitert.
Public Function Nz(wert As Variant) As Variant
    If IsError(wert) Then
        Nz = 0
    ElseIf IsEmpty(wert) Then
        Nz = 0
    Else
        Nz = wert
    End If
End Function
