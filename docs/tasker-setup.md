# Tasker Setup for Rho

> **See also:** [Tasker Profiles Reference](tasker-profiles.md) for a complete reference of every intent action, extras, and result format (including Rho daemon profiles).

This guide walks through setting up Tasker to receive commands from Termux and perform UI automation.

## Requirements

1. **Tasker** - [Play Store](https://play.google.com/store/apps/details?id=net.dinglisch.android.taskerm)
2. **AutoInput** - Tasker plugin for UI interaction
3. **Termux:Tasker** - Optional, for Tasker → Termux calls

## How It Works

```
Termux (rho)                    Tasker
     │                             │
     │  am broadcast ──────────►   │ Profile: Intent Received
     │  rho.tasker.click           │ Action: rho.tasker.click
     │  -e target "Sign In"        │
     │                             ▼
     │                        AutoInput: Click
     │                        target = %target
     │                             │
     │                             ▼
     │  ◄────────────────────  Write File
     │  %result_file (/storage/emulated/0/rho/...) │
     │  {"success": true}          │
     ▼                             │
  Read result                      │
```

Note: rho sends a **unique** `%result_file` path for every request (under `/storage/emulated/0/rho`). Always write results to `%result_file` from the intent extras; don’t hardcode paths.

## Tasker Configuration

### Step 1: Create Result Writer Task

**Task: RhoWriteResult**

```
A1: Variable Set
    Name: %result_file
    To: %par1
    
A2: Variable Set
    Name: %success
    To: %par2
    
A3: Variable Set
    Name: %data
    To: %par3
    
A4: Write File
    File: %result_file
    Text: %data
    Append: Off
```

Note: Pass the **full payload** as Parameter 3 (JSON must include `"success"`; screen reads use the `~~~` format).

### Step 2: Create Action Tasks

#### Task: RhoOpenUrl

```
A1: Browse URL
    URL: %url
    
A2: Wait
    Seconds: 2
    
A3: Perform Task
    Name: RhoWriteResult
    Parameter 1: %result_file
    Parameter 2: true
    Parameter 3: {"success": true, "action": "open_url", "url": "%url"}
```

#### Task: RhoLaunchApp

```
A1: Launch App
    App: %app
    (Use %package if %app is empty)

A2: Perform Task
    Name: RhoWriteResult
    Parameter 1: %result_file
    Parameter 2: true
    Parameter 3: {"success": true, "launched": "%app"}
```

#### Task: RhoClick

```
A1: AutoInput Action
    Type: Text
    Value: %target
    Action: Click
    
A2: If %err Set
      A3: Perform Task
          Name: RhoWriteResult
          Parameter 1: %result_file
          Parameter 2: false
          Parameter 3: {"success": false, "error": "Element not found: %target"}
    Else
      A4: Perform Task
          Name: RhoWriteResult
          Parameter 1: %result_file
          Parameter 2: true
          Parameter 3: {"success": true, "clicked": "%target"}
    End If
```

Note: For best reliability, prefer `%xcoord/%ycoord` when provided, then `%elementId`, then `%target`.

#### Task: RhoType

```
A1: AutoInput Action
    Type: Text
    Value: %target
    Action: Click
    (Skip if %target not set)
    
A2: Keyboard
    Input: write(%text)
    
A3: Perform Task
    Name: RhoWriteResult
    Parameter 1: %result_file
    Parameter 2: true
    Parameter 3: {"success": true, "typed": "%text"}
```

#### Task: RhoScreenshot

```
A1: Take Screenshot
    File: %screenshot_file
    
A2: Perform Task
    Name: RhoWriteResult
    Parameter 1: %result_file
    Parameter 2: true
    Parameter 3: {"success": true, "path": "%screenshot_file"}
```

#### Task: RhoReadScreen

```
A1: AutoInput UI Query
    (Uses %aitext(), %aiid(), %aicoords(), %aiapp)
    
A2: Variable Join
    Name: %aitext
    Joiner: |||
    
A3: Perform Task
    Name: RhoWriteResult
    Parameter 1: %result_file
    Parameter 2: true
    Parameter 3: %aiapp
               ~~~
               %aicoords()
               ~~~
               %aiid()
               ~~~
               %aitext()
               ~~~
               %err
```

#### Task: RhoReadScreenText

```
A1: AutoInput UI Query

A2: Variable Join
    Name: %aitext
    Joiner: |||

A3: Perform Task
    Name: RhoWriteResult
    Parameter 1: %result_file
    Parameter 2: true
    Parameter 3: {"success": true, "texts": "%aitext"}
```

#### Task: RhoScroll

```
A1: If %direction eq down
      A2: AutoInput Gestures
          Swipe: 540,1500 → 540,500
    Else
      A3: AutoInput Gestures
          Swipe: 540,500 → 540,1500
    End If

A4: Perform Task
    Name: RhoWriteResult
    Parameter 1: %result_file
    Parameter 2: true
    Parameter 3: {"success": true}
```

#### Task: RhoBack

```
A1: Back Button

A2: Perform Task
    Name: RhoWriteResult
    Parameter 1: %result_file
    Parameter 2: true
    Parameter 3: {"success": true}
```

#### Task: RhoHome

```
A1: Home Button

A2: Perform Task
    Name: RhoWriteResult
    Parameter 1: %result_file
    Parameter 2: true
    Parameter 3: {"success": true}
```

### Step 3: Create Intent Profiles

Create a profile for each action:

**Profile: Rho Open URL**
- Event: Intent Received
- Action: `rho.tasker.open_url`
- Task: RhoOpenUrl
- Pass variables: `%url`, `%result_file`

**Profile: Rho Launch App (used by open_app)**
- Event: Intent Received
- Action: `rho.tasker.launch_app`
- Task: RhoLaunchApp
- Pass variables: `%app`, `%package`, `%result_file`

**Profile: Rho Click**
- Event: Intent Received  
- Action: `rho.tasker.click`
- Task: RhoClick
- Pass variables: `%target`, `%elementId`, `%xcoord`, `%ycoord`, `%result_file`

**Profile: Rho Type**
- Event: Intent Received
- Action: `rho.tasker.type`
- Task: RhoType
- Pass variables: `%text`, `%target`, `%result_file`

**Profile: Rho Screenshot**
- Event: Intent Received
- Action: `rho.tasker.read_screenshot`
- Task: RhoScreenshot
- Pass variables: `%screenshot_file`, `%result_file`

**Profile: Rho Read Screen**
- Event: Intent Received
- Action: `rho.tasker.read_screen`
- Task: RhoReadScreen
- Pass variables: `%result_file`

**Profile: Rho Read Screen Text**
- Event: Intent Received
- Action: `rho.tasker.read_screen_text`
- Task: RhoReadScreenText
- Pass variables: `%result_file`

**Profile: Rho Scroll**
- Event: Intent Received
- Action: `rho.tasker.scroll`
- Task: RhoScroll
- Pass variables: `%direction`, `%result_file`

**Profile: Rho Back**
- Event: Intent Received
- Action: `rho.tasker.back`
- Task: RhoBack
- Pass variables: `%result_file`

**Profile: Rho Home**
- Event: Intent Received
- Action: `rho.tasker.home`
- Task: RhoHome
- Pass variables: `%result_file`

## Testing

From Termux:

```bash
# Test open URL
am broadcast --user 0 -a rho.tasker.open_url \
  -e url "https://example.com" \
  -e result_file "/storage/emulated/0/rho/tasker-result-test.json"

# Check result
cat /storage/emulated/0/rho/tasker-result-test.json

# Or use the rho command
/tasker open_url https://example.com
```

## Troubleshooting

1. **Intent not received**: Check Tasker is running, battery optimization disabled
2. **AutoInput not working**: Enable Accessibility Service for AutoInput
3. **Permission denied on result file**: Tasker needs storage permission for `/storage/emulated/0`
4. **Timeout**: Increase timeout or check Tasker logs

