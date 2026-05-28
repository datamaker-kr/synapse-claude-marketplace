# Advanced Logging Patterns

## Multi-Phase Progress Tracking

```python
def execute(self) -> dict:
    # Phase 1: Download
    self.ctx.log_message('Downloading dataset...', 'info')
    for i in range(100):
        self.ctx.set_progress(i, 100, category='download')
        # download logic

    # Phase 2: Training
    self.ctx.log_message('Training model...', 'info')
    for epoch in range(self.params.epochs):
        self.ctx.set_progress(epoch, self.params.epochs, category='training')

        # Log metrics per epoch
        self.ctx.set_metrics({
            'epoch': epoch,
            'loss': train_loss,
            'accuracy': train_acc
        }, 'training')

    # Phase 3: Evaluation
    self.ctx.log_message('Evaluating model...', 'info')
    self.ctx.set_progress(0, 1, category='evaluation')
    # evaluation logic
    self.ctx.set_progress(1, 1, category='evaluation')

    self.ctx.end_log()
    return {'status': 'completed'}
```

## Structured Event Logging

```python
# Log checkpoint event
ctx.log('checkpoint_saved', {
    'epoch': 10,
    'path': '/checkpoints/model_epoch10.pt',
    'metrics': {'loss': 0.05, 'accuracy': 0.95}
}, file='/checkpoints/model_epoch10.pt')

# Log data processing event
ctx.log('data_processed', {
    'total_samples': 10000,
    'valid_samples': 9850,
    'invalid_samples': 150,
    'processing_time': 120.5
})

# Log error event
ctx.log('error', {
    'type': 'ValidationError',
    'message': 'Invalid input format',
    'details': {'field': 'image_path', 'value': None}
})
```

## Debug Logging for Development

```python
# Debug events (not shown to end users)
ctx.log_dev_event('Model loaded', {
    'model_type': 'yolov8n',
    'parameters': 3.2e6,
    'device': 'cuda:0'
})

ctx.log_dev_event('Batch processed', {
    'batch_id': 42,
    'images': 32,
    'inference_time_ms': 45.2
})
```

## User-Facing Messages

```python
# Success messages
ctx.log_message('Model training completed successfully!', 'success')

# Warning messages
ctx.log_message('GPU memory is running low, consider reducing batch size', 'warning')

# Error messages
ctx.log_message('Failed to load checkpoint, starting from scratch', 'danger')

# Info messages
ctx.log_message('Processing 1000 images...', 'info')
```

## Using Backend Client

```python
if ctx.client:
    # Access backend API
    response = ctx.client.get('/api/v1/resource')

    # Upload results
    ctx.client.post('/api/v1/results', json={
        'job_id': ctx.job_id,
        'metrics': {'accuracy': 0.95}
    })
```

## Using Agent Client

```python
if ctx.agent_client:
    # Ray cluster operations
    status = ctx.agent_client.get_status()
    resources = ctx.agent_client.get_available_resources()
```

## Complete Training Loop Example

```python
class TrainAction(BaseAction[TrainParams]):
    def execute(self) -> dict:
        self.ctx.log_message('Initializing training...', 'info')

        # Load checkpoint if available
        start_epoch = 0
        if self.ctx.checkpoint:
            self.ctx.log_dev_event('Loading checkpoint', self.ctx.checkpoint)
            start_epoch = self._load_checkpoint()

        # Training loop
        for epoch in range(start_epoch, self.params.epochs):
            self.ctx.set_progress(epoch, self.params.epochs, 'training')

            train_loss = self._train_epoch()
            val_loss = self._validate()

            # Log metrics
            self.ctx.set_metrics({
                'epoch': epoch,
                'train_loss': train_loss,
                'val_loss': val_loss
            }, 'training')

            # Save checkpoint
            if epoch % 10 == 0:
                path = self._save_checkpoint(epoch)
                self.ctx.log('checkpoint', {'epoch': epoch, 'path': path})

        self.ctx.log_message('Training completed!', 'success')
        self.ctx.end_log()

        return {
            'status': 'completed',
            'epochs_trained': self.params.epochs,
            'final_loss': train_loss
        }
```
