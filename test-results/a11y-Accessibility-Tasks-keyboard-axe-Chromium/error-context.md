# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications (F8)":
    - list
  - region "Notifications alt+T"
  - generic [ref=e9]:
    - generic [ref=e10]:
      - img [ref=e12]
      - heading "Aurora Advisors" [level=1] [ref=e14]
      - paragraph [ref=e15]: Professional services platform
    - generic [ref=e16]:
      - generic [ref=e17]:
        - heading "Welcome" [level=3] [ref=e18]
        - paragraph [ref=e19]: Sign in to your account or create a new one
      - generic [ref=e21]:
        - tablist [ref=e22]:
          - tab "Sign In" [selected] [ref=e23] [cursor=pointer]
          - tab "Sign Up" [ref=e24] [cursor=pointer]
          - tab "Magic Link" [ref=e25] [cursor=pointer]
        - tabpanel "Sign In" [ref=e26]:
          - generic [ref=e27]:
            - generic [ref=e28]:
              - generic [ref=e29]: Email
              - textbox "Email" [ref=e30]
            - generic [ref=e31]:
              - generic [ref=e32]: Password
              - generic [ref=e33]:
                - textbox "Password" [ref=e34]
                - button [ref=e35] [cursor=pointer]:
                  - img [ref=e36] [cursor=pointer]
            - button "Sign In" [ref=e39] [cursor=pointer]:
              - img [ref=e40] [cursor=pointer]
              - text: Sign In
    - link "← Back to Home" [ref=e43] [cursor=pointer]:
      - /url: /
```