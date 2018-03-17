from __future__ import print_function
from app import app
from flask import render_template, request
import json

@app.route('/')
def index():
    return render_template('classer.html')

@app.route('/exportedData', methods=['POST'])
def exported_data():
    json_payload = request.get_json(force=True, silent=True)
    track_url = json_payload['metadata']['trackURL']
    if len(track_url.split('.')) == 1:
        track_format = ''
        base_track_url = track_url
    else:
        track_format = '_(' + track_url.lower().split('.')[-1] + ')'
        base_track_url = ''.join(track_url.split('.')[0:-1])
    output_name = base_track_url.lower().replace('.','_').replace(' ','_')
    output_name += track_format
    print(track_url)
    with open('app/static/data/'+output_name+'.json', 'w') as f:
        output = json.dumps(json_payload, f)
        f.write(output)
    return output




