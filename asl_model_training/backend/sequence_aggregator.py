class SequenceAggregator():
    def __init__(self,num_frames=30):
        self.partial_sequences = []
        self.num_frames = num_frames

    def add_partial_sequence(self,frame_data: list[float]):
        
        self.partial_sequences.append(frame_data)

        if len(self.partial_sequences) >= self.num_frames:
            return self.partial_sequences

        return None
    
    def clear_partial_sequence(self):
       self.partial_sequences = []