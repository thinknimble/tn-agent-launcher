Lets make some fundamental changes to the way we use prompts
1. AgentInstance should just have its prompt as part of its model so lets just make it a textfield on the model 
2. We will need a migration to add the field and transfer the existing prompts to work. 
3. Move variables over to the agent instance instead 

