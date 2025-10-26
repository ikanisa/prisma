# Chaos Mesh configuration

The manifests in this folder bootstrap Chaos Mesh in the `chaos-testing`
namespace and define reusable experiments that target the Prisma control plane
and data services. Apply the resources using `kubectl` or Kustomize once your
cluster has the [Chaos Mesh CRDs](https://chaos-mesh.org/docs/production-installation-using-helm/)
installed.

```bash
# create namespace + controller configuration
kubectl apply -k infra/chaos/chaos-mesh

# optional: install the latest Chaos Mesh chart
helm repo add chaos-mesh https://charts.chaos-mesh.org
helm upgrade --install chaos-mesh chaos-mesh/chaos-mesh \
  --namespace chaos-testing \
  --create-namespace \
  -f infra/chaos/chaos-mesh/values.yaml
```

## Experiments

- `experiments/db-throttle.yaml` – Throttles PostgreSQL bandwidth to mimic I/O
  saturation or noisy neighbours.
- `experiments/network-latency.yaml` – Injects cross-service latency between the
  API pods and downstream dependencies.
- `experiments/pod-kill.yaml` – Randomly deletes application pods to validate
  recovery automation.

The helper scripts in `scripts/chaos/` parameterise and schedule these
experiments for staging and production smoke tests.
