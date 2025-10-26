# Chaos experiment monitoring

These Prometheus rules model the service SLOs that must remain within
acceptable thresholds during and after chaos experiments. Import the files into
an existing Prometheus Operator or run them manually with `kubectl apply -f`.

The rules emit `Warning` alerts as SLO burn rates increase and promote them to
`Critical` once error budgets are exhausted. They also annotate alerts with the
active Chaos Mesh experiment so incident responders understand the blast radius.
