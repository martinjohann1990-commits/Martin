Option Explicit

' ===========================================================================
' modNavigation - Blattwechsel ueber die Schaltflaechen des Dashboards
' ===========================================================================


' Wird von den Navigations-Schaltflaechen mit dem Blattnamen aufgerufen.
Sub GeheZu(blatt As String)
    Dim ws As Worksheet

    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets(blatt)
    On Error GoTo 0

    If ws Is Nothing Then
        MsgBox "Das Blatt """ & blatt & """ existiert nicht.", vbExclamation, _
               "Navigation"
        Exit Sub
    End If

    ws.Visible = xlSheetVisible
    ws.Activate
    ws.Range("A1").Select
End Sub


Sub GeheZu_Start()
    GeheZu BLATT_START
End Sub


Sub GeheZu_Simulation()
    GeheZu BLATT_SIM
End Sub
